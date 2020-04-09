export const versionInfo = (() => {
    try {
      // tslint:disable-next-line:no-var-requires
      return require('../../versioning-info.json');
    } catch {
      // In dev the file might not exist:
      return {
        "sourceVersion": "local-dev-source-version",
        "buildDate": "local-dev-build-date",
        "buildNumber": "local-dev-build-number"
        };
    }
  })();