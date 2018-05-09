// tasks.js
// Copyright 2018 Michael Pyne <mpyne@purinchu.net>
// Just some auxiliary functions to help with generating the d3 Gantt chart with a useful
// ordering and dependency logic.
//
// Requires D3 to be present and loaded.  Tested with D3 5.x
//
// TODO: Make Web Scale (TM) and all Node.js'y

if (!d3) {
    throw new Error("D3 is required for tasks.js");
}

function parseTasks(taskInput) {
    let tasks = [];
    let deps  = [];
    var curHeader;
    let taskId = 1;

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
                continue;
            }
            else if (task.status === "DEPS") {
                deps.push(task);
                continue;
            }
            else if (curHeader) {
                task.header = curHeader;
                task.taskId = taskId++;
            }

            tasks.push(task);
        } else {
            throw "Invalid task " + line + "!";
        }
    }

    return [tasks, deps];

    function decodeTaskSpec(taskSpec) {
        // "blah blah task name (performer) this part ignored"
        const taskPerformerSpec_re = /^([^(]+)\(([^)]+)\)/;
        const result = taskPerformerSpec_re.exec(taskSpec);

        if (result) {
            return [result[1].trim(), result[2].trim()];
        }
        else {
            console.log (taskSpec + " had no performer");
            return [taskSpec, null]; // no performer
        }
    }

    function taskFromInputLine(line) {
        // line must be .trim()'d already for regex to work right

        // Look for dependency (syntax 1)
        const line_re = /([-a-zA-Z0-9_ .()\/]+) [fF]rom (2[0-9]{3}-[0-1]?[0-9]-[0-3]?[0-9]) [tT]o (2[0-9]{3}-[0-1]?[0-9]-[0-3]?[0-9])$/;

        let result = line_re.exec(line);
        if (result) {
            const [name, perf] = decodeTaskSpec(result[1].trim());
            return {
                startDate: new Date(result[2]),
                endDate  : new Date(result[3]),
                taskName : name,
                performer: perf,
                deps     : [ ],
                status   : "TASK"
            };
        }

        // Look for dependency with duration (syntax 2)
        const task_dep_re = /([-a-zA-Z0-9_ .()\/]+) [tT]akes ([0-9]+) days?$/;
        result = task_dep_re.exec(line);
        if (result) {
            const [name, perf] = decodeTaskSpec(result[1].trim());
            return {
                startDate: null,
                endDate  : null,
                duration : +(result[2].trim()),
                taskName : name,
                performer: perf,
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
        result = /^([a-zA-Z0-9_ \/]+)\s*(?:[Dd]epends on|[Nn]eeds)\s([a-zA-Z0-9_ \/]+)$/.exec(line);
        if (result) {
            return {
                requiringTaskName: result[1].trim(),
                requiredTaskName:  result[2].trim(),
                status   : "DEPS"
            }
        }

        return null;
    }
}

// Given an array of tasks and an array of dependency edges with the *names* of
// the right tasks, returns an array of dependency edges with the *task
// objects* themselves, and also encodes the dependencies into the task objects
// themselves (in the task.deps array)
function resolveDeps(tasks, deps) {
    let taskNames = new Map();  // Maps task name to task
    tasks.forEach(t => taskNames.set(t.taskName, t));

    // Converts wordy dependency spec into array with a dependency edge
    return deps.map((dep) => {
        const requiredTask  = taskNames.get(dep.requiredTaskName);
        if (!requiredTask) {
            throw new Error('No such required task ' + dep.requiredTaskName);
        }

        const requiringTask = taskNames.get(dep.requiringTaskName);
        if (!requiringTask) {
            throw new Error('No such requiring task ' + dep.requiringTaskName);
        }

        requiringTask.deps.push(requiredTask);

        return [ requiringTask, requiredTask ];
    });
}

// Assuming tasks are already in required dependency order, calculates the
// amount of time that is required for dependent tasks due to their
// dependencies not being met, and pushes back their start times appropriately.
// As a side effect, also ensures tasks have a defined end date (based on adjusted start
// date and imbedded duration).
// Returns the given list of tasks
function relaxTaskConflicts(tasks) {
    for(let task of tasks) {
        if (task.status === "HEADER") {
            // Skip for now and recalculate once all dates fixed
            continue;
        }

        if (!task.startDate) {
            task.startDate = new Date();
        }

        // Use task.deps for "real" dependencies but also include implied
        // dependencies which are just used to prevent concurrent performance
        // of tasks by the same performer
        for(const dep of task.deps.concat(task.impliedDeps || [])) {
            if (dep.endDate > task.startDate) {
                const duration = task.duration || Math.ceil(
                    (task.endDate.getTime() - task.startDate.getTime()) /
                    (1000 * 60 * 60 * 24));
                task.originalStartDate = task.originalStartDate || task.startDate;
                task.startDate = new Date(dep.endDate.getTime());
                task.startDate.setDate(task.startDate.getDate() + 1); // Add a day

                // Move end date to maintain same overall duration
                task.endDate = new Date(task.startDate.getTime());
                task.endDate.setDate(task.endDate.getDate() + duration);
            }
        }

        // If we have implied dependencies they have met their need and we can
        // remove them here
        if (task.impliedDeps) {
            delete task.impliedDeps;
        }

        if (!task.endDate) {
            if (!task.duration) {
                throw new Error(`Task ${task.taskName} has no end!`);
            }

            task.endDate = new Date(task.startDate.getTime());
            task.endDate.setDate(task.startDate.getDate() + task.duration);
        }
    };

    // Fix header dates
    tasks.filter(task => task.status === "HEADER").forEach(header => {
        const taskGroup = tasks.filter(task => task.header === header);
        const minDate = d3.min(taskGroup, taskInGroup => taskInGroup.startDate);
        const maxDate = d3.max(taskGroup, taskInGroup => taskInGroup.endDate);

        header.startDate = minDate;
        header.endDate   = maxDate;
    });

    return tasks;
}

// Assuming tasks are already in dependency order, ensures that tasks that have
// the same performer have implied happens-after dependencies added.  The
// implied ordering is based on the start dates assigned.  This means each task
// needs to *have* a start date.
function addImpliedPerformerDependencies(tasks) {
    let performerTasks = new Map();

    // Track "implied" dependencies separately so that we can show only "real"
    // dependencies.
    tasks.forEach(task => task.impliedDeps = []);

    // First break up the tasks by performer.
    for (const task of tasks) {
        let taskArray = performerTasks.get(task.performer);
        if (taskArray) {
            taskArray.push(task);
        }
        else {
            performerTasks.set(task.performer, [task]);
        }
    }

    // Sort each performer array by start Date and link tasks together
    performerTasks.forEach((performersTasks, performer) => {
        // in-place sort!
        performersTasks.sort((a, b) => {
            if (a.startDate.getTime() < b.startDate.getTime()) { return -1; }
            if (a.startDate.getTime() > b.startDate.getTime()) { return  1; }
            return 0;
        });

        performersTasks.reduce((l, r) => {
            r.impliedDeps.push(l); // Add implied dep
            // Don't accumulate, just return so this becomes new 'l'
            return r;
        });
    });

    // To make these dependencies take effect we have to re-run
    // relaxTaskConflicts (at least until I find faster way)
    return relaxTaskConflicts(tasks);
}
