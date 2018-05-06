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

  var tickFormat = "%H:%M";

  var keyFunction = function(d) {
    return d.startDate + d.taskName + d.endDate;
  };

  var rectTransform = function(d) {
    return "translate(" + x(d.startDate) + "," + y(d.taskName) + ")";
  };

  var x,y,xAxis,yAxis;

  initAxis();

  var initTimeDomain = function(tasks) {
    timeDomainStart = d3.min(tasks, (task) => task.startDate);
    timeDomainEnd   = d3.max(tasks, (task) => task.endDate);
  };

 function initAxis() {
    x = d3.scaleTime()
      .domain([ timeDomainStart, d3.timeMonth.offset(timeDomainStart, 3) ])
      .nice(d3.timeWeek, 1)
      .range([ 0, width ]).clamp(true);

    y = d3.scaleBand()
      .domain(taskTypes)
      .range([ 0, height - margin.top - margin.bottom ])
      .padding(0.5)
      .align(0.5);

    xAxis = d3.axisBottom().scale(x)
      .tickFormat(d3.timeFormat(tickFormat))
      .tickSize(8).tickPadding(8);

    yAxis = d3.axisLeft().scale(y)
      .tickSize(0);
  };

  function dataMerge(ganttChartGroup, tasks) {
    var rect = ganttChartGroup.selectAll("rect").data(tasks, keyFunction);

    // See D3's "General Update Pattern"
    rect.exit().remove();

    rect.enter()
      .append("rect")
      .attr("y", 0)
    .merge(rect)
      .attr("rx", (d) => (taskRoundiness[d.status] || 5))
      .attr("ry", (d) => (taskRoundiness[d.status] || 5))
      .attr("class", (d) => (taskStatus[d.status] || "bar"))
      .attr("transform", rectTransform)
      .attr("height", () => y.bandwidth())
      .attr("width", (d) => x(d.endDate) - x(d.startDate));
  }

  function gantt(tasks) {

    initTimeDomain(tasks);
    initAxis();

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

    dataMerge(svg, tasks);
    resetAndCreateAxes();

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

    dataMerge(svg.select(".gantt-chart"), tasks);
    resetAndCreateAxes();

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
