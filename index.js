const fs = require("fs");
const path = require("path");
const appDirectory = fs.realpathSync(process.cwd())
const resolveApp = relativePath => path.resolve(appDirectory, relativePath);
const appPackageJson = resolveApp('package.json')
const appVersion = require(appPackageJson).version;

const upgradeVersion = (currentVersion) => {
    if (!currentVersion || typeof currentVersion !== 'string') {
        return '1.0.0';
    }

    const [major, minor, revision] = currentVersion.split('.');

    // 新修订号
    let newRevision = +revision + 1;
    const moreRevision = newRevision >= 100;
    newRevision = moreRevision ? 0 : newRevision;

    // 次版本号
    let newMinor = moreRevision ? +minor + 1 : +minor;
    const moreMinor = newMinor >= 100;
    newMinor = moreMinor ? 0 : newMinor;

    // 主版本号
    let newMajor = moreMinor ? +major + 1 : +major;
    const moreMajor = newMajor >= 100;
    newMajor = moreMajor ? 0 : newMajor;

    return [newMajor, newMinor, newRevision].join('.');
}

const getGNUVersion = (version) => `${version} build-${(Math.random() * 1e1).toFixed(5)}`;

const getVersionCode = (version) => `<meta name="version" content="${version}">`;

const PLUGIN_NAME = 'systemVersionPlugin';

/**
 * GNU 风格版本号
 * 主版本号 . 子版本号 [. 修正版本号[ build- 编译版本号 ]]
 * 例：1.2.0 build-1234
 */
class SystemVersionPlugin {
    constructor(htmlWebpackPlugin, options) {
        this.htmlWebpackPlugin = htmlWebpackPlugin;
        this.options = options || {};
    }

    apply(compiler) {
        const {callback} = this.options;

        const currentVersion = this.getCurrentVersion();

        const nextVersion = upgradeVersion(currentVersion);

        const metaCode = getVersionCode(getGNUVersion(nextVersion));

        compiler.hooks.compilation.tap(PLUGIN_NAME, compilation => {
            this.htmlWebpackPlugin.getHooks(compilation).beforeEmit.tap(PLUGIN_NAME, data => {
                data.html = data.html.replace(/<head>/, `<head>${metaCode}`);
            });

            this.updateVersionToPackage(nextVersion);

            callback?.();
        });
    }

    getCurrentVersion() {
        let {version, auto = true} = this.options;

        if (auto || !version) {
            version = appVersion;
        } else {
            if (typeof version === 'function') {
                version = version?.();
            }
        }

        return version;
    }

    updateVersionToPackage(version) {
        fs.readFile(appPackageJson, 'utf-8', (err, data) => {
            const json = JSON.parse(data);
            json.version = version;
            const newJson = JSON.stringify(json);

            fs.writeFile(appPackageJson, newJson, err => {
                if (err) console.log(err);
            })
        })
    }
}

module.exports = SystemVersionPlugin;
