// Function to create interactive vertical charts
function createVerticalChart(containerId, data, xLabel, yLabel, chartTitle, tooltipData) {
    const margin = { top: 50, right: 40, bottom: 60, left: 80 };
    const width = 1100 - margin.left - margin.right;
    const height = 600 - margin.top - margin.bottom;

    const svg = d3.select(`#${containerId}`).append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("position", "absolute")
        .style("background", "rgba(0, 0, 0, 0.8)")
        .style("color", "#fff")
        .style("padding", "8px")
        .style("border-radius", "5px")
        .style("font-size", "14px")
        .style("visibility", "hidden");

    const xScale = d3.scaleLinear().domain(d3.extent(data, d => d.x)).range([0, width]);
    const yScale = d3.scaleLinear().domain([0, d3.max(data, d => d.y)]).nice().range([height, 0]);

    const xAxis = d3.axisBottom(xScale).tickFormat(d3.format("d"));
    const yAxis = d3.axisLeft(yScale).tickFormat(d3.format(".2s"));

    svg.append("g").attr("transform", `translate(0,${height})`).call(xAxis);
    svg.append("g").call(yAxis);

    const line = d3.line().x(d => xScale(d.x)).y(d => yScale(d.y)).curve(d3.curveMonotoneX);
    svg.append("path").datum(data).attr("fill", "none").attr("stroke", "#9c27b0").attr("stroke-width", 3).attr("d", line);

    svg.selectAll("circle").data(data).enter().append("circle")
        .attr("cx", d => xScale(d.x))
        .attr("cy", d => yScale(d.y))
        .attr("r", 5).attr("fill", "#9c27b0").attr("stroke", "#4a148c").attr("stroke-width", 1.5)
        .on("mouseover", (event, d) => {
    const film = tooltipData.find(f => f.year === d.x);
    tooltip.style("visibility", "visible")
        .transition() // Apply transition for fade-in effect
        .duration(200)
        .style("opacity", 1) // Fade in the tooltip
        .on("start", function() { // Set HTML content when the transition starts
            d3.select(this).html(`<strong>${film.title}</strong><br>${film.year}<br><strong>${yLabel}:</strong> $${d.y.toLocaleString()}`);
        });
})
.on("mousemove", event => tooltip.style("left", `${event.pageX + 10}px`).style("top", `${event.pageY - 30}px`))
.on("mouseout", () => {
    tooltip.transition() // Apply transition for fade-out effect
        .duration(200)
        .style("opacity", 0) // Fade out the tooltip
        .on("end", () => tooltip.style("visibility", "hidden")); // Hide the tooltip when fade-out completes
});

}

// Function to create bar chart for distributors
function createDistributorChart(containerId, data) {
    const margin = { top: 50, right: 40, bottom: 120, left: 100 };
    const width = 1300 - margin.left - margin.right;
    const height = 800 - margin.top - margin.bottom;

    const svg = d3.select(`#${containerId}`).append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const distributorCounts = d3.rollups(data, v => v.length, d => d.distributor)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

    const xScale = d3.scaleBand().domain(distributorCounts.map(d => d[0])).range([0, width]).padding(0.4);
    const yScale = d3.scaleLinear().domain([0, d3.max(distributorCounts, d => d[1])]).range([height, 0]);

    svg.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(xScale)).selectAll("text")
        .attr("transform", "rotate(-40)").style("text-anchor", "end");
    svg.append("g").call(d3.axisLeft(yScale).ticks(10));

    svg.selectAll(".bar").data(distributorCounts).enter().append("rect")
        .attr("class", "bar").attr("x", d => xScale(d[0])).attr("y", d => yScale(d[1]))
        .attr("width", xScale.bandwidth()).attr("height", d => height - yScale(d[1]))
        .attr("fill", "#9c27b0");
}

// Function to populate the film table with sorting functionality
function populateFilmTable(data) {
    const table = d3.select(".film_table table");
    
    // Ensure table body is cleared before populating
    table.select("tbody").remove();
    const tbody = table.append("tbody");

    // Function to render rows
    function renderRows(data) {
        tbody.html(""); // Clear previous rows
        data.forEach(film => {
            const row = tbody.append("tr");
            row.append("td").text(film.year);
            row.append("td").html(`<a href="${film.url}" target="_blank">${film.title}</a>`);
            row.append("td").text(film.director);
            row.append("td").text(film.distributor);
            row.append("td").text(film.country);
            row.append("td").text(`$${Number(film.budget).toLocaleString()}`);
            row.append("td").text(`$${Number(film.box_office).toLocaleString()}`);
        });
    }

    renderRows(data); // Initial table load

    // Sorting logic
    let sortOrder = {}; // Track sorting direction for each column
    table.selectAll("th").on("click", function () {
        const column = d3.select(this).text().toLowerCase().replace(/\s+/g, "_"); // Normalize column names
        let key = column; // Default sorting key

        // Convert text-based values to numbers for sorting where needed
        if (column === "budget" || column === "box_office") {
            key = d => Number(d[column].replace(/[^0-9.-]+/g, "")); // Convert currency to number
        } else if (column === "year") {
            key = d => +d.year; // Convert year to number
        } else {
            key = d => d[column].toLowerCase(); // Sort text columns case-insensitively
        }

        // Toggle sorting order
        sortOrder[column] = !sortOrder[column];

        data.sort((a, b) => {
            let valA = key(a), valB = key(b);
            return sortOrder[column] ? d3.ascending(valA, valB) : d3.descending(valA, valB);
        });

        renderRows(data); // Re-render table with sorted data
    });
}

// Function to update the Top 10 most popular distributors list
function updateMostPopularDistributors(data) {
    // Count occurrences of each distributor
    const distributorCounts = d3.rollups(data, v => v.length, d => d.distributor)
        .sort((a, b) => b[1] - a[1]) // Sort by number of films
        .slice(0, 10); // Take top 10

    // Select the <ul> inside #info3 and update list items
    const list = d3.select("#info3 ul");
    list.html(""); // Clear existing items

    distributorCounts.forEach(([distributor, count]) => {
        list.append("li")
            .html(`<strong>${distributor}</strong> - ${count} films`);
    });
}

// Function to update the Top 10 highest-grossing films list
function updateHighestGrossingFilms(data) {
    // Sort films by box office earnings in descending order and take the top 10
    const topFilms = data.sort((a, b) => b.box_office - a.box_office).slice(0, 10);

    // Select the <ul> inside #info2 and update list items
    const list = d3.select("#info2 ul");
    list.html(""); // Clear existing items

    topFilms.forEach(film => {
        list.append("li")
            .html(`<strong>${film.title}</strong> (${film.year}) - $${film.box_office.toLocaleString()}`);
    });
}

// Function to update the Top 10 most expensive films list
function updateMostExpensiveFilms(data) {
    // Sort films by budget in descending order and take the top 10
    const topFilms = data.sort((a, b) => b.budget - a.budget).slice(0, 10);

    // Select the <ul> inside #info1 and update list items
    const list = d3.select("#info1 ul");
    list.html(""); // Clear existing items

    topFilms.forEach(film => {
        list.append("li")
            .html(`<strong>${film.title}</strong> (${film.year}) - $${film.budget.toLocaleString()}`);
    });
}

// Load data and create charts
function loadData() {
    d3.json("output/data.json").then(data => {
        createDistributorChart("chart3", data);
        
        const formattedData = data.map(d => ({
            year: +d.year, title: d.title, budget: +d.budget, box_office: +d.box_office
        }));

        const budgetData = formattedData.map(d => ({ x: d.year, y: d.budget }));
        const boxOfficeData = formattedData.map(d => ({ x: d.year, y: d.box_office }));

        createVerticalChart('chart1', budgetData, "Year", "Budget ($)", "Film Budgets by Year", formattedData);
        createVerticalChart('chart2', boxOfficeData, "Year", "Box Office ($)", "Film Box Office by Year", formattedData);
        populateFilmTable(data);
        updateMostPopularDistributors(data);
        updateHighestGrossingFilms(data);
        updateMostExpensiveFilms(data);
    }).catch(error => console.error("Error loading data:", error));
}

// Initialize
loadData();
