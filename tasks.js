// tasks.js
// Copyright 2018 Michael Pyne <mpyne@purinchu.net>
// Just some auxiliary functions to help with generating the d3 Gantt chart with a useful
// ordering and dependency logic.
//
// TODO: Make Web Scale (TM) and all Node.js'y

function parseTasks(taskInput) {
    let tasks = [];
    let deps  = [];
    var curHeader;

    const lines = taskInput.trim()
        .split(/\n+/)
        .map(str => str.replace(/#.*$/, '').trim())
        .filter(str => str.length > 0);

    for (const line of lines) {
        const task = taskFromInputLine(line.trim());

        if (task) {
            if (task.status === "HEADER") {
                // New header
                curHeader = task;
            }
            else if (task.status === "DEPS") {
                deps.push(task);
                continue;
            }
            else if (curHeader) {
                task.header = curHeader;
                curHeader.startDate =
                    (task.startDate.getTime() < curHeader.startDate.getTime())
                        ? task.startDate
                        : curHeader.startDate;
                curHeader.endDate =
                    (task.endDate.getTime() > curHeader.endDate.getTime())
                        ? task.endDate
                        : curHeader.endDate;
            }

            tasks.push(task);
        } else {
            throw "Invalid task " + line + "!";
        }
    }

    return [tasks, deps];

    function taskFromInputLine(line) {
        // line must be .trim()'d already for regex to work right

        // Look for dependency (syntax 1)
        const line_re = /([a-zA-Z0-9_ ]+) [fF]rom (2[0-9]{3}-[0-1]?[0-9]-[0-3]?[0-9]) [tT]o (2[0-9]{3}-[0-1]?[0-9]-[0-3]?[0-9])$/;

        let result = line_re.exec(line);
        if (result) {
            return {
                startDate: new Date(result[2]),
                endDate  : new Date(result[3]),
                taskName : result[1].trim(),
                deps     : [ ],
                status   : "TASK"
            };
        }

        // Look for dependency with duration (syntax 2)
        const task_dep_re = /([a-zA-Z0-9_ ]+) [tT]akes ([0-9]+) days?$/;
        result = task_dep_re.exec(line);
        if (result) {
            return {
                startDate: null,
                endDate  : null,
                duration : +(result[2].trim()),
                taskName : result[1].trim(),
                deps     : [ ],
                status   : "TASK"
            }
        }

        // Look for header line
        result = /^--+\s*(.*)\s*--+$/.exec(line);
        if (result) {
            return {
                startDate: new Date(2037, 12, 31),
                endDate  : new Date(1970, 0, 1),
                taskName : result[1].trim(),
                deps     : [ ],
                status   : "HEADER"
            }
        }

        // Look for dependency declaration
        result = /^([a-zA-Z0-9_ ]+)\s*(?:[Dd]epends on|[Nn]eeds)\s([a-zA-Z0-9_ ]+)$/.exec(line);
        if (result) {
            console.log(`Adding ${result[2]} as a dependency of ${result[1]}`);
            return {
                requiringTaskName: result[1].trim(),
                requiredTaskName:  result[2].trim(),
                status   : "DEPS"
            }
        }

        return null;
    }
}

function resolveDeps(tasks, deps) {
    let taskNames = new Map();  // Maps task name to task

    tasks.forEach(t => taskNames.set(t.taskName, t));

    if (!deps.every(dep => taskNames.has(dep.requiredTaskName) && taskNames.has(dep.requiringTaskName)))
    {
        let missingTasks = deps
            .filter(dep => !taskNames.has(dep.requiredTaskName) || !taskNames.has(dep.requiringTaskName))
            .map(brokenDep => [brokenDep.requiringTaskName, brokenDep.requiredTaskName])
            .reduce((acc, task) => acc.concat(task), []);
        throw new Error("Missing tasks " + missingTasks.join(', '));
    }

    // Converts wordy dependency spec into array with a dependency edge
    return deps.map((dep) => {
        const requiredTask  = taskNames.get(dep.requiredTaskName);
        const requiringTask = taskNames.get(dep.requiringTaskName);

        requiringTask.deps.push(requiredTask);

        return [ requiringTask, requiredTask ];
    });
}

