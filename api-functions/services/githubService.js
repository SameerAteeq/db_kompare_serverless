const axios = require("axios");
const moment = require("moment");
const dotenv = require("dotenv");

dotenv.config();

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_API_URL = "https://api.github.com/search";

// Delay between API requests in milliseconds to respect rate limits
const REQUEST_DELAY = 2000;

async function fetchMetricsByDateRange(
  query,
  date,
  processedRepoIds = new Set()
) {
  let totalStars = 0;
  let totalRepos = 0;
  let page = 1;
  const perPage = 100;
  const maxPages = 10; // To adhere to the 1,000 result cap

  const headers = {
    Authorization: `Bearer ${GITHUB_TOKEN}`,
  };

  try {
    while (page <= maxPages) {
      const response = await axios.get(`${GITHUB_API_URL}/repositories`, {
        headers,
        params: {
          q: `${query} in:name,description,readme created:${date}`,
          sort: "stars",
          order: "desc",
          per_page: perPage,
          page: page,
        },
      });

      const repositories = response.data.items;
      totalRepos = response.data?.total_count;

      // Process each repository in the current page to get the stars
      repositories.forEach((repo) => {
        if (!processedRepoIds.has(repo.id)) {
          totalStars += repo.stargazers_count;

          processedRepoIds.add(repo.id);
        }
      });
      console.log("Processing page:", page);

      // If fewer results than perPage, break the loop as there are no more pages
      if (repositories.length < perPage) {
        break;
      }

      // Increment the page number to fetch the next set of results
      page += 1;

      // Delay before the next request to respect the rate limit
      await new Promise((resolve) => setTimeout(resolve, REQUEST_DELAY));
    }

    return {
      totalStars,
      totalRepos,
    };
  } catch (error) {
    console.log(
      `Error fetching GitHub data for "${query}" from ${date}: ${
        error.response ? error.response.data.message : error.message
      }`
    );
    return null;
  }
}

async function fetchTotalIssuesCount(query, date) {
  const headers = {
    Authorization: `Bearer ${GITHUB_TOKEN}`,
  };

  try {
    const response = await axios.get(`${GITHUB_API_URL}/issues`, {
      headers,
      params: {
        q: `${query} created:${date} state:open`,
      },
    });
    return response.data.total_count;
  } catch (error) {
    console.log(
      `Error fetching total issues count for "${query}" for ${date}: ${
        error.response ? error.response.data.message : error.message
      }`
    );
    return null;
  }
}

async function getGitHubMetrics(query) {
  // Get yesterday's date and format it
  // const date = "2024-11-05";
  const date = moment().subtract(1, "days").format("YYYY-MM-DD");

  const processedRepoIds = new Set();

  let cumulativeStars = 0;
  let cumulativeRepos = 0;
  let cumulativeIssuesCount = 0;

  const metrics = await fetchMetricsByDateRange(query, date, processedRepoIds);

  if (metrics) {
    cumulativeStars += metrics.totalStars;
    cumulativeRepos += metrics.totalRepos;
  } else {
    console.log(`Failed to fetch metrics for "${query}" for ${date}.`);
  }

  const issuesCount = await fetchTotalIssuesCount(query, date);

  if (issuesCount !== null) {
    console.log(
      `Fetched total issues count for "${query}" for ${date}: ${issuesCount}`
    );
    cumulativeIssuesCount += issuesCount;
  } else {
    console.log(
      `Failed to fetch total issues count for "${query}" for ${date}.`
    );
  }

  return {
    totalStars: cumulativeStars,
    totalRepos: cumulativeRepos,
    totalIssues: cumulativeIssuesCount,
  };
}

export { getGitHubMetrics };
