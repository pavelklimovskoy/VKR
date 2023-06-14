anychart.onDocumentReady(renderChart);

let dataTree, skillList = [], disabledSkills = [];

// Фильтрация включенных скиллов
function filterSkills(data) {
  data[0].children.forEach(item => {
    item.children.forEach(item => {
      item.children.forEach(item => {
        if (!item.enabled) {
          disabledSkills.push(item);
        }
      });
    });
  });

  return disabledSkills;
}

// Получение всех скиллов
function unfilteringSkills(data) {
  data[0].children.forEach(item => {
    item.children.forEach(item => {
      item.children.forEach(item => {
        skillList.push(item);
      });
    });
  });

  return skillList;
}

// Выключение скилла
function disableSkill(skillName) {
  let child = dataTree.search('name', skillName),
    root = dataTree.search('name', 'Me');
  if (child) {
    let parent = child.getParent(),
      grandParent = parent.getParent();

    parent.removeChild(child);
    if (!parent.numChildren()) {
      grandParent.removeChild(parent);
      if (!grandParent.numChildren()) {
        root.removeChild(grandParent);
      }
    }
  }
}

// Включение скилла
function enableSkill(skill) {
  let treeParent = dataTree.search('name', skill.parent),
    treeGrandParent = dataTree.search('name', skill.grandParent),
    root = dataTree.search('name', 'Me');

  if (treeGrandParent) {
    if (treeParent) {
      treeParent.addChild(skill);
    } else {
      let parent = {
        'name': skill.parent,
        'id': skill.id,
        'value': '1',
        'fill': skill.fill,
        'parent': skill.grandParent,
        'children': []
      };

      treeGrandParent.addChild(parent).addChild(skill);
    }
  } else {

    let grandParent = {
      'name': skill.grandParent,
      'id': skill.id,
      'fill': skill.fill,
      'parent': 'Me',
      'children': []
    };

    let parent = {
      'name': skill.parent,
      'id': skill.id,
      'value': '1',
      'fill': skill.fill,
      'parent': skill.grandParent,
      'children': []
    };

    root.addChild(grandParent).addChild(parent).addChild(skill);
  }
}

// Добавление скилла на диаграмму
function addSkillToChart(skillName, skillParentName, skillGrandParentName, skillType, skillFilling) {
  // console.log(skillName, skillName, skillGrandParentName);
  // console.log(skillType, skillFilling);
  let treeChild = dataTree.search('name', skillName),
    treeParent = dataTree.search('name', skillParentName),
    treeGrandParent = dataTree.search('name', skillGrandParentName);
  // console.log(treeChild);
  // console.log(treeParent);
  // console.log(treeGrandParent);

  if (!treeChild) {
    let shortName = skillName;

    let grandParent = {
      'name': skillGrandParentName,
      'id': skillType,
      'fill': skillFilling,
      'parent': 'Me',
      'children': []
    };

    let parent = {
      'name': skillParentName,
      'id': skillType,
      'value': '1',
      'fill': skillFilling,
      'parent': skillGrandParentName,
      'children': []
    };

    let skill = {
      'name': skillName,
      'id': skillType,
      'value': '1',
      'enabled': true,
      'shortName': shortName,
      'fill': skillFilling,
      'grandParent': skillGrandParentName,
      'parent': skillParentName
    };

    skillList.push(skill);

    if (treeGrandParent) {
      if (treeParent) {
        treeParent.addChild(skill);
      } else {
        treeGrandParent.addChild(parent).addChild(skill);
      }
    } else {
      console.log(dataTree.search('name', 'Me'));
      console.log(grandParent);
      console.log(parent);
      console.log(skill);
      dataTree.search('name', 'Me').addChild(grandParent).addChild(parent).addChild(skill);
    }

    return skill;
  }
}

// Подсчет допустимых символов скилла 
function charCalc(n) {
  console.log(n);
  if (n <= 22) {
    return Math.round(n * n * 0.0472029 - 2.1169 * n + 25.8119);
  }
  else if (n <= 28) {
    return 2;
  }
  else {
    return 1;
  }
}

// Отрисовка диаграммы
function renderChart() {
  let urlRequest = `${baseUrl}/getChartJson`;

  anychart.data.loadJsonFile(urlRequest,
    function (data) {
      let userData = data[0].children,
        totalSkills = 0;

      userData.forEach(skillLvl1 => {
        skillLvl1.children.forEach(skillLvl2 => {
          skillLvl2.children.forEach(skillLvl3 => {
            if (skillLvl3.enabled) {
              totalSkills++;
            }
          });
        });
      });

      let maxChars = charCalc(totalSkills);

      userData.forEach(skillLvl1 => {
        skillLvl1.children.forEach(skillLvl2 => {
          skillLvl2.children.forEach(skillLvl3 => {
            if (skillLvl3.name.length > maxChars) {
              skillLvl3.shortName = `${skillLvl3.name.slice(0, maxChars)}…`;
            }
            else {
              skillLvl3.shortName = skillLvl3.name;
            }
          });
        });
      });

      dataTree = anychart.data.tree(data);
      disabledSkills = filterSkills(data);
      skillList = unfilteringSkills(data);

      let chart = anychart.sunburst(dataTree);

      chart.calculationMode('parent-independent');
      chart.sort('asc');

      chart.tooltip().useHtml(true);
      chart.labels().useHtml(true);

      chart
        .level(0)
        .labels()
        .fontFamily('Verdana, sans-serif')
        .format('<span style="font-size:14px; word-break: normal; word-wrap: break-word; animation: visible 2s;"></span>');

      chart
        .level(1)
        .labels()
        .fontFamily('Verdana, sans-serif')
        .format('<span style="font-size:14px; word-break: normal; word-wrap: break-word;">{%name}</span>');

      chart
        .level(2)
        .labels()
        .fontFamily('Verdana, sans-serif')
        .format('<span style="font-size:12px; word-break: normal; word-wrap: break-word;">{%name}</span>');

      chart
        .tooltip()
        .fontFamily('Verdana, sans-serif')
        .format("<h5 style='font-size:16px;"+
                "margin: 0.25rem 0;'>{%name}"+
                "</h5>"+
                "<h6 style='font-size:14px;"+
                "font-weight:400; margin: 0.2rem 0;'>Level: "+
                "<b>{%value}{groupsSeparator:\\,}</b></h6>"+
                "<h6 style='font-size:14px; font-weight:400; margin: 0.2rem 0;'></b></h6>");

      // Set avatar
      fetch(`${baseUrl}/getAvatar`)
        .then(data => data.text())
        .then(data => chart.fill({
          src: `../static/data/img/${data}`,
          mode: 'fit'
        }));

      chart.labels().format("<span style='font-size:10px; "+
                            "word-break: normal;"+
                            "word-wrap: break-word;'>{%shortName}</span>");

      chart.labels().position('circular');
      chart.container('chartid');

      anychart.licenseKey('digitalprofessionalme-be4540c2-fc50f81b');
      chart.credits().enabled(false);

      chart.draw();
      chart.autoRedraw(true);

      createTimeline();
      calcSkillsWeightAndShowIt();

      disabledSkills.forEach(skill => disableSkill(skill.name));

      // Удаление белого квадрата фокруг диаграммы
      let layer = document.getElementById("ac_layer_4");
      layer.remove();
    });
}
