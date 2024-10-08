/** @file Format And post data retrieved from Lighthouse. */

import "isomorphic-fetch";

/**
 * Join two arrays. (Just so syntax highlighting & prettier formatting work).
 *
 * @param {TemplateStringsArray} query - Array of default joiner values.
 * @param {...string} placeholderValues - Array of placeholder values.
 *
 * @returns {string} - The joined arrays.
 */
function graphql(query, ...placeholderValues) {
	return (
		placeholderValues.reduce(
			(last, placeholder, index) => `${last}${placeholder}${query[index + 1]}`,
			query[0],
		) || ""
	);
}

/**
 * Comment on the Lighthouse issue.
 *
 * @param {string} body - Body of the comment.
 *
 * @returns {Promise<string>} - Result from GitHub's GraphQL API.
 */
function commentOnDiscussion(body) {
	return fetch("https://api.github.com/graphql", {
		body: JSON.stringify({
			// TODO: use gh action
			query: graphql`mutation {
					addDiscussionComment(
						input: {discussionId: "", body: ${JSON.stringify(body)}}
					) {
					  comment {
						id
					  }
					}
				  }`,
		}),

		headers: {
			"Authorization": `Bearer ${process.argv[2]}`,
			"GraphQL-Features": "discussions_api",
		},

		method: "POST",
	}).then((result) => result.text());
}

/**
 * Transpose array.
 *
 * @template T
 * @param {T[][]} array - Array to transpose.
 *
 * @returns {T[][]} - Transposed array.
 */
function transpose(array) {
	return array[0].map((_, index) => array.map((row) => row[+index]));
}

/**
 * Get the average of an array.
 *
 * @param {number[]} array - Array to average.
 *
 * @returns {number} - The average.
 */
function getAverage(array) {
	return array.reduce((accumulated, next) => accumulated + next, 0) / array.length;
}

/**
 * Add emoji colored based on a number.
 *
 * @param {number} number - Number to base the emoji off of.
 *
 * @returns {string} - An appropriately colored emoji followed by the number.
 */
function addEmoji(number) {
	return `${number < 50 ? "🔴" : number < 90 ? "🟡" : "🟢"} ${number}`;
}

/**
 * @type {{
 * 	code: string;
 * 	data: {
 * 		url: string;
 * 		emulatedFormFactor: string;
 * 		scores: {
 * 			accessibility: number;
 * 			bestPractices: number;
 * 			performance: number;
 * 			progressiveWebApp: number;
 * 			seo: number;
 * 		};
 * 	}[];
 * }}
 */
let data;

try {
	if (process.argv[4]) throw new Error(process.argv[4]);

	data = JSON.parse(`${process.argv[3]}`);

	if (data.code !== "SUCCESS") throw new Error(`code: ${data.code}`);
} catch (error) {
	commentOnDiscussion(
		`An error occurred while retrieving the data from Lighthouse.\n\`\`\`js\n${error}\n\`\`\``,
	);

	throw error;
}

try {
	const allScores = transpose(
		data.data.map(({ scores }) => [
			scores.accessibility,
			scores.bestPractices,
			scores.performance,
			scores.seo,
		]),
	).map(getAverage);

	console.log(data.data[0].emulatedFormFactor);

	commentOnDiscussion(
		`${
			"<h2>Today’s Lighthouse scores</h2><br /> <br />" +
			"<table><thead><tr><th>URL</th>" +
			"<th>Device</th>" +
			"<th>Accessibility</th>" +
			"<th>Best Practices</th>" +
			"<th>Performace</th>" +
			"<th>SEO</th>" +
			"<th>Overall</th>" +
			"<th>PageSpeed Insights</th></tr></thead><tbody>"
		}${data.data.reduce(
			(accumulated, { scores, url, emulatedFormFactor }) =>
				`${accumulated}<tr><td><a href="${url.trim()}">${
					(url[url.length - 1] === "/" ? url : `${url}/`)
						.trim()
						.split("https://homeschool.rebeccareid.com")[1]
				}</a></td>` +
				`<td>${emulatedFormFactor}</td>` +
				`<td>${addEmoji(scores.accessibility)}</td>` +
				`<td>${addEmoji(scores.bestPractices)}</td>` +
				`<td>${addEmoji(scores.performance)}</td>` +
				`<td>${addEmoji(scores.seo)}</td>` +
				`<td>${addEmoji(
					getAverage([
						scores.accessibility,
						scores.bestPractices,
						scores.performance,
						scores.seo,
					]),
				)}</td><td>` +
				`<a href="https://developers.google.com/speed/pagespeed/insights/?url=${encodeURIComponent(
					`https://${url.trim()}`,
				)}&tab=${emulatedFormFactor}">More information</a></td></tr>`,
			"",
		)}</tbody><tfoot><tr><td colspan="2"><b>Overall</b></td>` +
			`<td><b>${allScores.map(addEmoji).join("</b></td><td><b>")}</b></td>` +
			`<td colspan="2"><b><i>${addEmoji(
				getAverage(allScores),
			)}</i></b></td></tr></tbody></table>`,
	);
} catch (error) {
	commentOnDiscussion(
		"An error occurred while generating the comment.\n" +
			`\`\`\`js\n${JSON.stringify(error)}\n\`\`\``,
	);

	throw error;
}
