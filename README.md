# Using and Developing Generator Script(s)


## Inputs
- `export PAT_FOR_ISSUES=<YOURPAT>`
- `export GITHUB_WORKSPACE=<PATH TO ROOT OF REPO>`
- `npm install`
- `node issue_summary_generator.js`


This action summarizes the issues and created a file `issue-summary.md`

## Example usage

```yaml
name: issue-summary
on:
  issues:
    types: [opened, closed]
jobs:
  summarize-issues:
    runs-on: ubuntu-latest
    steps:
    - uses: olicea/issue-summary@master
      with:
        PAT_FOR_ISSUES: "${{ secrets. GitHub_Actions_Token }}"
        GITHUB_WORKSPACE: "olicea/test"
        COMMITTER_EMAIL: olicea@github.com
        COMMITTER_NAME: Octavio Licea Leon
```
