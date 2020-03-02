# Using and Developing Generator Script(s)


## Steps to test
- `export PAT_FOR_ISSUES=<YOURPAT>`
- `export GITHUB_WORKSPACE=<PATH TO ROOT OF REPO>`
- `export COMMITER_NAME=name`
- `export COMMITER_EMAIL=email-address`
- `npm install`
- `node index.js`


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
