/**
 * @author Dimitry Kudrayvtsev
 * @version 2.0
 *
 * Ported to d3 v4 by Keyvan Fatehi on October 16th, 2016
 * See http://bl.ocks.org/baramuyu/be8e3005cfcb0aba5f763963c75f3c7e
 *
 * Copyright 2012 Dimitry Kudrayvtsev
 *
 * SPDX-License-Identifier: MIT
 */

d3.gantt = function() {
  var margin = {
    top : 0,
    right : 30,
    bottom : 50,
    left : 60
  };
  var timeDomainStart;
  var timeDomainEnd;
  var taskTypes = [];
  var taskStatus = [];
  var taskRoundiness = {
    HEADER: 2,
    TASK  : 5,
  };

  var ganttNode = document.getElementById('gantt_wrapper');
  var height = ganttNode.offsetHeight;
  var width  = ganttNode.offsetWidth;
  var g_tooltipDiv;

  var tickFormat = "%H:%M";

  var keyFunction = function(d) {
    return d.startDate + d.taskName + d.endDate;
  };

  var rectTransform = function(d) {
    return "translate(" + x(d.startDate) + "," + y(d.performer) + ")";
  };

  var x,y,xAxis,yAxis;

  initAxis();

  var initTimeDomain = function(tasks) {
    timeDomainStart = d3.min(tasks, (task) => task.startDate);
    timeDomainEnd   = d3.max(tasks, (task) => task.endDate);
  };

  function makeTooltip(task) {
    const monthFormat = d3.timeFormat("%Y-%m-%d");
    const formattedStart = monthFormat(task.startDate);
    const formattedEnd = monthFormat(task.endDate);
    const performer = task.performer || "??";

    return `<b>${task.taskName}</b><br>
          (Part of <i>${task.header.taskName}</i>)<br>
          From ${formattedStart} to ${formattedEnd}<br>
          Worked by ${performer}`;
  }

  function initAxis() {
    x = d3.scaleTime()
//    .domain([ timeDomainStart, d3.timeMonth.offset(timeDomainStart, 3) ])
      .domain([ timeDomainStart, timeDomainEnd ])
      .nice(d3.timeWeek, 1)
      .range([ 0, width ]).clamp(true);

    y = d3.scaleBand()
      .domain(Array.from(taskTypes).sort())
      .range([ 0, height - margin.top - margin.bottom ])
      .padding(0.5)
      .align(0.5);

    xAxis = d3.axisBottom().scale(x)
      .tickFormat(d3.timeFormat(tickFormat))
      .tickSizeInner(-height)
      .tickSizeOuter(8)
      .tickPadding(4);

    yAxis = d3.axisLeft().scale(y)
      .tickSize(0);
  };

  function dataMerge(ganttChartGroup, tasks) {
    var rect = ganttChartGroup.selectAll("rect").data(tasks, keyFunction);

    // Used for task highlighting in mousein/mouseout below
    const highlightFn = (d, setClass) => {
      for (task of d.deps) {
        d3.select('#task-' + task.taskId)
          .classed('highlight', setClass);
        if (task.deps.length > 0) {
          highlightFn(task, setClass);
        }
      }
    };

    // See D3's "General Update Pattern"
    rect.exit().remove();

    rect.enter()
      .append("rect")
        .attr("y", 0)
        .attr("id", d => 'task-' + d.taskId)
        .on("mouseover", d => {
          g_tooltipDiv.transition()
            .duration(200)
            .style("opacity", 0.9);

          // 60 in "top" should correspond to div.tooltip in index.html CSS
          g_tooltipDiv.html(makeTooltip(d), d.taskName + "<br/>")
            .style("left", (d3.event.pageX) + "px")
            .style("top",  (d3.event.pageY - 60) + "px");

          // Highlight all task dependencies recursively
          highlightFn(d, true);
        })
        .on("mouseout", d => {
          highlightFn(d, false);
          g_tooltipDiv.transition()
            .duration(500)
            .style("opacity", 0);
        })
      .merge(rect)
        .attr("rx", (d) => (taskRoundiness[d.status] || 5))
        .attr("ry", (d) => (taskRoundiness[d.status] || 5))
        .attr("class", (d) => (taskStatus[d.status] || "bar"))
        .attr("transform", rectTransform)
        .attr("height", () => y.bandwidth())
        .attr("width", (d) => x(d.endDate) - x(d.startDate));

    // Add nasty red lines for dependency-induced delays
    var delayLines = ganttChartGroup
      .selectAll("g.delay")
        // filter to data that has an original start date and were not "floating"
        .data(tasks.filter(d => !!d.originalStartDate && !d.duration), keyFunction);

    delayLines.exit().remove();
    delayLines.enter()
      .append("g")
        .attr("class", "delay")
      .append("line")
      .merge(delayLines)
        .attr("x1", d => x(d.originalStartDate))
        .attr("y1", d => y(d.performer))
        .attr("x2", d => x(d.startDate))
        .attr("y2", d => y(d.performer) + y.bandwidth());
  }

  function gantt(tasks) {
    initTimeDomain(tasks);
    initAxis();

    // Add a separate div for tooltips
    g_tooltipDiv = d3.select("body").append("div")
      .attr("class", "tooltip")
      .style("opacity", 0);

    // Setup main chart area (without loading data)
    var svg = d3.select("div#gantt_wrapper")
      .append("svg")
        .attr("class", "chart")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
      .append("g")
        .attr("class", "gantt-chart")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .attr("transform", "translate(" + margin.left + ", " + margin.top + ")");

    resetAndCreateAxes();
    dataMerge(svg, tasks);

    return gantt;

  };

  function resetAndCreateAxes() {
    var svg = d3.select("svg g.gantt-chart");

    svg.select("g.x_axis").remove();
    svg.select("g.y_axis").remove();

    svg.append("g")
      .attr("class", "x_axis")
      .attr("transform", "translate(0, " + (height - margin.top - margin.bottom) + ")")
      .call(xAxis);

    svg.append("g")
      .attr("class", "y_axis")
      .call(yAxis);
  }

  gantt.redraw = function(tasks) {
    initTimeDomain(tasks);
    initAxis();

    var svg = d3.select("svg");

    resetAndCreateAxes();
    dataMerge(svg.select(".gantt-chart"), tasks);

    return gantt;
  };

  gantt.margin = function(value) {
    if (!arguments.length)
      return margin;
    margin = value;
    return gantt;
  };

  gantt.timeDomain = function(value) {
    if (!arguments.length)
      return [ timeDomainStart, timeDomainEnd ];
    timeDomainStart = +value[0], timeDomainEnd = +value[1];
    return gantt;
  };

 /**
  * @param {string}
  *                vale The value can be "fit" - the domain fits the data or
  *                "fixed" - fixed domain.
  */
  gantt.timeDomainMode = function(value) {
    if (!arguments.length)
      return timeDomainMode;
    timeDomainMode = value;
    return gantt;

  };

  gantt.taskTypes = function(value) {
    if (!arguments.length)
      return taskTypes;
    taskTypes = value;
    return gantt;
  };

  gantt.taskStatus = function(value) {
    if (!arguments.length)
      return taskStatus;
    taskStatus = value;
    return gantt;
  };

  gantt.width = function(value) {
    if (!arguments.length)
      return width;
    width = +value;
    return gantt;
  };

  gantt.height = function(value) {
    if (!arguments.length)
      return height;
    height = +value;
    return gantt;
  };

  gantt.tickFormat = function(value) {
    if (!arguments.length)
      return tickFormat;
    tickFormat = value;
    return gantt;
  };

  return gantt;
};
