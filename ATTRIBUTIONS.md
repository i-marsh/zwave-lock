# Third-Party Licenses and Attributions

This project uses the following open-source dependencies. We are grateful to the maintainers and contributors of these projects.

## Direct Dependencies

### zwave-js (MIT License)
- **Version**: ^13.0.0
- **License**: MIT
- **Repository**: https://github.com/zwave-js/node-zwave-js
- **Copyright**: © Z-Wave JS contributors
- **Description**: Complete Z-Wave driver for Node.js
- **Note**: This is the core library that enables all Z-Wave functionality

### express (MIT License)
- **Version**: ^5.1.0
- **License**: MIT
- **Repository**: https://github.com/expressjs/express
- **Copyright**: © 2009-2014 TJ Holowaychuk, 2013-2014 Strong Loop, Inc., 2014-present Douglas Christopher Wilson
- **Description**: Fast, unopinionated, minimalist web framework for Node.js

### cors (MIT License)
- **Version**: ^2.8.5
- **License**: MIT
- **Repository**: https://github.com/expressjs/cors
- **Copyright**: © 2013 Troy Goode
- **Description**: Node.js CORS middleware

### commander (MIT License)
- **Version**: ^12.0.0
- **License**: MIT
- **Repository**: https://github.com/tj/commander.js
- **Copyright**: © 2011 TJ Holowaychuk
- **Description**: Complete solution for node.js command-line interfaces

## Development Dependencies

### TypeScript (Apache-2.0 License)
- **Version**: ^5.3.0
- **License**: Apache-2.0
- **Repository**: https://github.com/microsoft/TypeScript
- **Copyright**: © Microsoft Corporation
- **Description**: TypeScript language and compiler

### @types/* (MIT License)
- **Packages**: @types/node, @types/express, @types/cors
- **License**: MIT
- **Repository**: https://github.com/DefinitelyTyped/DefinitelyTyped
- **Description**: Type definitions for TypeScript

## Notable Transitive Dependencies

### serialport (MIT License)
- **License**: MIT
- **Repository**: https://github.com/serialport/node-serialport
- **Copyright**: © 2010-2014 Chris Williams
- **Description**: Access serial ports with JavaScript (used by zwave-js)

### axios (MIT License)
- **License**: MIT
- **Repository**: https://github.com/axios/axios
- **Copyright**: © 2014-present Matt Zabriskie
- **Description**: Promise based HTTP client (used by zwave-js)

## License Summary

All dependencies use permissive open-source licenses compatible with commercial use:

- **MIT License**: 218 packages - Permissive, allows commercial use
- **ISC License**: 13 packages - Functionally equivalent to MIT
- **Apache-2.0**: 3 packages - Permissive with patent grant
- **BSD-3-Clause**: 2 packages - Permissive with attribution
- **BSD-2-Clause**: 1 package - Simplified BSD
- **0BSD**: 1 package - Public domain equivalent

## License Compatibility

All licenses used in this project are:
- ✅ Compatible with MIT License (this project's license)
- ✅ Allow commercial use
- ✅ Allow modification and distribution
- ✅ Do not have copyleft requirements
- ✅ Compatible with closed-source derivatives (if desired)

## Generating Updated License Report

To generate an updated license report:

```bash
npx license-checker --summary
npx license-checker --json > licenses.json
```

## Compliance

### Attribution Requirements

The MIT, ISC, BSD, and Apache licenses require:
1. ✅ Include copyright notices (satisfied by this file)
2. ✅ Include license text (satisfied by copying LICENSE files)
3. ✅ Provide attribution (satisfied by this ATTRIBUTIONS.md)

### Patent Grant

Apache-2.0 licensed dependencies (TypeScript, reflect-metadata, human-signals) include an explicit patent grant, providing additional protection.

### No Copyleft

None of the dependencies use copyleft licenses (GPL, LGPL, AGPL, etc.), so there are no viral licensing requirements.

## Security & Maintenance

All dependencies are:
- Actively maintained
- Widely used in production
- Have security disclosure processes
- Regularly updated for vulnerabilities

Run `npm audit` to check for known vulnerabilities.

## Updates and Changes

Last updated: November 26, 2025

To check for updates to this information:
```bash
npm outdated
npm audit
npx license-checker --summary
```

## Questions?

For licensing questions or concerns:
1. Review the individual project licenses in `node_modules/*/LICENSE`
2. Check the official project repositories
3. Consult with legal counsel for commercial use questions

## Acknowledgments

Special thanks to:
- The **zwave-js** team for creating an excellent pure JavaScript Z-Wave library
- The **Node.js** and **TypeScript** communities
- All open-source contributors who made this project possible

---

*This file is maintained to ensure proper attribution and license compliance. If you notice any errors or omissions, please open an issue.*
