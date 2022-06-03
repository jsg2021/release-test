const Handlebars = require('handlebars');

const repoURL = (root, ref) =>
  (root.repository
    ? [
        root.host,
        ...(ref.repository
          ? [ref.owner, ref.repository]
          : [root.owner, root.repository]),
      ]
    : [root.repoUrl]
  )
    .filter(Boolean)
    .join('/');

Handlebars.registerHelper({
  repoURL,
  linkRefs(header, references, root) {
    const uniqueBy = fn => {
      let seen = new Set();
      return (...args) => {
        const id = fn(...args);
        if (seen.has(id)) {
          return false;
        }
        seen.add(id);
        return true;
      };
    };

    return references.filter(uniqueBy(ref => ref.prefix + ref.issue)).reduce(
      (out, ref) =>
        out.replaceAll(ref.prefix + ref.issue, issue => {
          let baseURL = 'https://waybetter.atlassian.net/browse';
          let issueURL = `${baseURL}/${issue}`;

          if (ref.prefix === '#') {
            issueURL = [repoURL(root, ref), root.issue, ref.issue].join('/');
          }

          return `[${issue}](${issueURL})`;
        }),
      header
    );
  },
});

const parserOpts = {
  issuePrefixes: 'WBRT-,#',
  noteKeywords: ['BREAKING CHANGE', 'BREAKING CHANGES', 'BREAKING'],
};

module.exports = {
  branches: ['main'],
  plugins: [
    [
      '@semantic-release/commit-analyzer',
      {
        preset: 'conventionalcommits',
        parserOpts,
      },
    ],
    [
      '@semantic-release/release-notes-generator',
      {
        preset: 'conventionalcommits',
        parserOpts,
        writerOpts: {
          commitsSort: ['subject', 'scope'],
          commitPartial:
            `
            *{{#if scope}} **{{scope}}:**
              {{~/if}} {{#if subject}}
                {{~linkRefs subject references @root}}
              {{~else}}
                {{~linkRefs header references @root}}
              {{~/if}}

              {{~!-- commit link --}}{{~#if hash}} {{#if @root.linkReferences~}}
                ([{{shortHash}}]({{repoURL @root}}/{{@root.commit}}/{{hash}}))
              {{~else}}
                {{~shortHash}}
              {{~/if}}{{~/if}}
          `.trim() + '\n\n',
        },
      },
    ],
    '@semantic-release/changelog',
    '@semantic-release/github',
    [
      '@semantic-release/git',
      {
        'assets': ['CHANGELOG.md'],
        'message': 'chore(release): ${nextRelease.version} [skip ci]'
      }
    ],
    '@semantic-release/npm'
  ],
};
