# -*- coding: utf-8 -*-

"""
    Фйал с роутаами для работы со скиллами

"""

from flask import Blueprint
from flask_login import login_required,  current_user
from flask import request




from bson import json_util
import json


skills_routes = Blueprint('skills_routes', __name__, template_folder='templates')


@skills_routes.route('/skillInputAutocomplete', methods=['POST'])
def show_input_options():
    from ...rchilli import RchilliConnector
    return RchilliConnector.get_instance().skill_autocomplete(request.get_json()['skillName'])


@skills_routes.route('/translatedSkillInputAutocomplete', methods=['POST'])
def show_translated_input_options():
    from ...rchilli import RchilliConnector
    # print(request.get_json()['skillName'])
    translated = RchilliConnector.get_instance().get_translate_text(request.get_json()['skillName'])
    # print(translated)
    return RchilliConnector.get_instance().skill_autocomplete(translated)


@skills_routes.route('/changeSkillState', methods=['POST', 'GET'])
def change_skill_state():
    from ...rchilli import RchilliConnector
    from ...db_connector import DatabaseConnector
    skill_name = request.get_json()['skill']
    DatabaseConnector.get_instance().disable_skill(current_user.id, skill_name)
    return '200'


@skills_routes.route('/findSkill', methods=['POST'])
def find_skill():
    from ...rchilli import RchilliConnector
    from ...db_connector import DatabaseConnector
    from ...service import ServiceContainer
    soft_types = ['SoftSkill', 'Knowledge', 'Soft', 'BehaviorSkills']

    skill_name = request.get_json()['skill']
    cur_user_data = DatabaseConnector.get_instance().find_record('id', current_user.id).json_data[0]

    resp = RchilliConnector.get_instance().skill_search(skill_name)
    ontoloty = resp['ontology']

    flag1 = False
    flag2 = False
    filling = ''

    for grand_parent_skill_type in cur_user_data['children']:
        if ontoloty.split('>')[0] == grand_parent_skill_type['name']:
            flag1 = True

            for parent_skill_type in grand_parent_skill_type['children']:
                # Найден Parent, GrandParent
                if ontoloty.split('>')[1] == parent_skill_type['name']:
                    flag2 = True

                    short_name = ontoloty.split('>')[-1]
                    if len(short_name) > 6:
                        short_name = f'{ontoloty.split(">")[-1][:6]}...'

                    if resp['type'] in soft_types:
                        filling = '#FFB240'
                    else:
                        filling = '#4188D2'

                    skill = {
                        'name': ontoloty.split('>')[-1],
                        'id': resp['type'],
                        'value': '1',
                        'enabled': True,
                        'short_name': short_name,
                        'fill': filling,
                        'grandParent': grand_parent_skill_type['name'],
                        'parent': parent_skill_type['name']
                    }
                    parent_skill_type['children'].append(skill)
                    break

            if flag2 is False:  # Parent не найден, только GrandParent
                parent_skill_type = {
                    'name': ontoloty.split('>')[1],
                    'id': resp['type'],
                    'value': '1',
                    'fill': ServiceContainer.get_instance().color_calc(1, resp['type']),
                    'parent': grand_parent_skill_type['name'],
                    'children': []
                }

                short_name = ontoloty.split('>')[-1]
                if len(short_name) > 6:
                    short_name = f'{ontoloty.split(">")[-1][:6]}...'

                if resp['type'] in soft_types:
                    filling = '#FFB240'
                else:
                    filling = '#4188D2'

                skill = {
                    'name': ontoloty.split('>')[-1],
                    'id': resp['type'],
                    'value': '1',
                    'enabled': True,
                    'short_name': short_name,
                    'fill': filling,
                    'grandParent': grand_parent_skill_type['name'],
                    'parent': parent_skill_type['name']
                }
                parent_skill_type['children'].append(skill)
                grand_parent_skill_type['children'].append(parent_skill_type)

    if flag1 is False:  # Не найдено ни GrandParent, ни Parent
        grand_parent_skill_type = {
            'name': ontoloty.split('>')[0],
            'id': resp['type'],
            'value': '1',
            'fill': ServiceContainer.get_instance().color_calc(1, resp['type']),
            'parent': 'Me',
            'children': []
        }

        parent_skill_type = {
            'name': ontoloty.split('>')[1],
            'id': resp['type'],
            'value': '1',
            'fill': ServiceContainer.get_instance().color_calc(1, resp['type']),
            'parent': grand_parent_skill_type['name'],
            'children': []
        }

        short_name = ontoloty.split('>')[-1]
        if len(short_name) > 6:
            short_name = f'{ontoloty.split(">")[-1][:6]}...'

        if resp['type'] in soft_types:
            filling = '#FFB240'
        else:
            filling = '#4188D2'

        skill = {
            'name': ontoloty.split('>')[-1],
            'id': resp['type'],
            'value': '1',
            'enabled': True,
            'short_name': short_name,
            'fill': filling,
            'grandParent': grand_parent_skill_type['name'],
            'parent': parent_skill_type['name']
        }

        parent_skill_type['children'].append(skill)
        grand_parent_skill_type['children'].append(parent_skill_type)
        cur_user_data['children'].append(grand_parent_skill_type)

    if filling != '':
        resp['filling'] = filling
    else:
        resp['filling'] = '#4188D2'

    DatabaseConnector.get_instance().update_record('id', current_user.id, 'jsondata', [cur_user_data])

    return resp


@skills_routes.route('/findJobsOptions', methods=['GET'])
@login_required
def find_jobs_by_skills():
    """
    Метод для рекомендации работы по навыками пользователся
    :return:
    """
    from ...rchilli import RchilliConnector
    from ...db_connector import DatabaseConnector
    from collections import defaultdict
    import operator

    # Получение экземпляров одиночек
    db_instance = DatabaseConnector.get_instance()
    rchilli_instance = RchilliConnector.get_instance()

    skills_current_user = db_instance.get_owned_skills(current_user.id)
    user_skills_set = set(skills_current_user)

    related_jobs = defaultdict(lambda: 1)

    # Перебираем все умения пользователя
    for current_skill in user_skills_set:
        # Получение списка работ и курсов для отдельного навыка
        skill_data = db_instance.skill_in_dataset(current_skill)
        if skill_data is None:
            continue

        # Перебираем все работы для конкретного навыка и считаем их упоминания
        for job in skill_data['relatedJobs']:
            related_jobs[job] += 1

    # Получаем самую популярную работу
    matched_job = max(related_jobs, key=related_jobs.get)

    completed_job_name = rchilli_instance.job_autocomplete(matched_job)
    job_data = rchilli_instance.job_search(completed_job_name)['Skills']

    req_skills_set = set([data['Skill'] for data in job_data])

    skill_gap = user_skills_set.difference(req_skills_set)

    # Получение курсов по заданому набору скиллов
    courses = db_instance.get_courses(skill_gap)

    return json.loads(json_util.dumps({
        'offeredCourses': courses,
        'gapSkills': skill_gap,
        'matchedJob': matched_job
    }))
