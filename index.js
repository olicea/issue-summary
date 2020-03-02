/* issue-summary/index.js
 *   This file will fetch the issues from a certain repo and create a summary, stylized as a dashboard
 

 The inputs needed and some examples are
 
  export PAT_FOR_ISSUES=<YOUR_PAT>
  OUTPUT_FILE_NAME: issue_summary.md
  CONFIG_JSON= [{"title":"test issues", "label:"test-issues", "thresholds":"10,20,30"}, {"label:"needs-triage"}]
  COMMITTER_EMAIL: olicea@github.com
  COMMITTER_NAME: Octavio Licea Leon
  COMMITER_USERNAME: olicea 
 */

const { Octokit } = require("@octokit/rest");
const octokit = new Octokit({
    auth: process.env.PAT_FOR_ISSUES
});

const fs = require("fs");
//const project_id = process.env.PROJECT_ID;
var config_json = process.env.CONFIG_JSON;

const defaultFileName = 'issue_summary.md';
const default_config_json = "[{\"label\":\"needs-triage\"}]";
const default_thresholds = [10,20,30];

const workspace = process.env.GITHUB_WORKSPACE;
if (workspace == undefined)
{
    throw "You must specify a repository on the variable GITHUB_WORKSPACE";
}

const repoParts = workspace.split("/");
if (repoParts.length != 2)
{
    throw "GITHUB_WORKSPACE must be on the form owner/reponame, for example olicea/pokefacts";
}

const owner = repoParts[0];
const repo = repoParts[1];


var fileName = process.env.OUTPUT_FILE_NAME;
if (fileName == undefined)
{
    fileName = defaultFileName;
}

// Read the input json and validate it
function readWidgetConfiguration(config_json)
{
    // if no config is specified, use default one
    if(config_json == undefined)
    {
        config_json = default_config_json;
    }

    const parsed_config = JSON.parse(config_json);
    if (parsed_config == undefined ||
        parsed_config.length == 0)
    {
        throw "You must specify at least one configuration as the config_json, for example \"[{\"label\":\"needs-triage\"}]\"";
    }

    var widgetConfigs = [];
    for (var i=0; i<parsed_config.length; i++) {
        const config_item = parsed_config[i];
        var widget = { label: config_item.label, title: config_item.title, count: 0};

        // The only required value is the label, if it is missing we need to fail
        if (widget.label == undefined)
        {
            throw "config_json contains an item, without label";
        }

        // If there is no title specified, then use the label as the title
        if (widget.title == undefined)
        {
            widget.title = widget.label;
        }

        // If the thresholds are not specified then use the default ones
        if (config_item.thresholds == undefined)
        {
            widget.thresholds = default_thresholds;
        }
        // otherwise, parse the input end expect exactly 3 integers
        else
        {
            const config_item_thresholds = config_item.thresholds.split(",");
            if (config_item_thresholds.length != 3 || 
                isNaN(config_item_thresholds[0]) ||
                isNaN(config_item_thresholds[1]) ||
                isNaN(config_item_thresholds[2]))
            {
                throw "you musth have exactly 3 integers as the thresholds";
            }
            widget.thresholds = config_item_thresholds;
        }

        // include the widget in the config
        widgetConfigs.push(widget);
    }

    return widgetConfigs;
} 

async function fetchIssues(widgetConfigs)
{
    const issues  = await octokit.issues.listForRepo({ owner: owner, repo: repo});

    var issuesByAssignee = {};
    // - Count issues per label
    issues.data.forEach(issue => {
        if (issue.labels != undefined && issue.labels.length >0) {
            //console.log(`id ${issue.id} labels ${issue.labels}`);

            issue.labels.forEach(label => {
                widgetConfigs.forEach(widget => {
                    if (widget.label.toUpperCase() === label.name.toUpperCase())
                    {
                        widget.count = widget.count +1;
                    }
                });
            });
        }

        // count by assignee
        if (issue.assignees != undefined)
        {
            if (issue.assignees.length == 0)
            {
                if (issuesByAssignee["unassigned"] == undefined)
                {
                    issuesByAssignee["unassigned"] = 1;
                }
                else
                {
                    issuesByAssignee["unassigned"] +=1;
                }
            }
            else {
                issue.assignees.forEach(assignee => {
                    var count =issuesByAssignee[assignee.login];
                    if (count == undefined)
                    {
                        issuesByAssignee[assignee.login] = 1;
                    }
                    else
                    {
                        issuesByAssignee[assignee.login] = count + 1;
                    }
                });
            }
        }
    });

    widgetConfigs.push({ title: "all issues", count: issues.data.length});

    // - Format output
    const data = formatData(widgetConfigs, issuesByAssignee);

    writeToFile(fileName, data);

    commitFile(data);
}

function writeToFile(fileName, data) {
  fs.writeFile(fileName, data, "utf8", function(err) {
    if (err) throw "error writing file: " + err;
  });
}

function formatData(widgetConfigs, issuesByAssignee)
{
    var data = "# Issue summary\n";
        data += "## Issues by label\n";
    widgetConfigs.forEach(widget => {
        data += `* [${widget.title} ${widget.count}](https://github.com/${repo}/issues?q=is%3Aopen+is%3Aissue${widget.label != undefined? `$+label%3A${widget.label}` : ""})\n`;
    });

    data += "## Issues by owner\n";
    for(var assignee in issuesByAssignee) {
        data += `* [${assignee} ${issuesByAssignee[assignee]}](https://github.com/${repo}/issues?q=assignee%3A${assignee}+is%3Aopen)\n`;
    }
    return data;
}

async function commitFile(data)
{
    const email = process.env.COMMITTER_EMAIL;
    const name = process.env.COMMITTER_NAME;
    //const userName = process.env.COMMITER_USERNAME; 

    if (email == undefined || name == undefined) // || userName == undefined)
    {
        console.warn("missing COMMITTER_EMAIL, NAME, or USERNAME. Skipping commiting the content to the repo");
        return;
    }

    const buffer = Buffer.alloc(data.length,data);

    try{
        // find the file
        var file  = await octokit.repos.getContents({ owner: owner, path: fileName, repo: repo });

        // update, provide previous hash
        existing  = await octokit.repos.createOrUpdateFile({owner:owner, 
            repo: repo, 
            path: fileName, 
            message: `Updating ${fileName}`, 
            content: buffer.toString('base64'),
            committer: {email: email, name: name },
            author: { email: email, name: name },
            sha: file.data.sha
        });
    }
    catch
    {
        // create file
        await octokit.repos.createOrUpdateFile({owner:owner, 
            repo: repo, 
            path: fileName, 
            message: `Updating ${fileName}`, 
            content: buffer.toString('base64'),
            committer: {email: email, name: name },
            author: { email: email, name: name },
        });
    }
    console.log(data);
}

async function run()
{
    // - Read the config_json
    var widgetConfigs = readWidgetConfiguration(config_json);

    // - Get issues from repo
    await fetchIssues(widgetConfigs);
}

run();