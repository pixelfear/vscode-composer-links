import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(vscode.languages.registerHoverProvider({
        scheme: 'file',
        language: 'json',
        pattern: '**/composer.json',
    }, {
        provideHover(doc, position) {
            // The hovered range will include quotes.
            const range = doc.getWordRangeAtPosition(position);
            const packageName = doc.getText(range).replace(/^"|"$/g, '');

            // Make sure that we're hovering over a package name within require or require-dev.
            const json = doc.getText();
            const isPackage = packageName.includes('/');
            const isInsideDependencies = new RegExp(`"(require|require-dev)":\\s*?\\{[\\s\\S]*?${packageName.replace(/\//g, '\\/')}[\\s\\S]*?\\}`, 'gm').test(json);
            if (!isInsideDependencies || !isPackage) return;

            return new Promise((resolve, reject) => {
                const path = `${doc.fileName.replace('composer.json', '')}vendor/composer/installed.json`;
                const uri = vscode.Uri.file(path);
                vscode.workspace.fs.readFile(uri).then(response => {
                    const json = JSON.parse(response.toString());
                    const packages = json.packages || json; // composer v2 has them under a packages key
                    const pkg = packages.find((p: any) => p.name === packageName);
                    resolve(new vscode.Hover(createHoverContentsFromPackage(pkg)));
                });
            });
        }
    }));
}

export function deactivate() {}

const createHoverContentsFromPackage = function (pkg: any) {
    const sourceUrl = pkg.source.url;
    const sourceText = sourceUrl.includes('github.com') ? 'GitHub' : 'Source';
    const sourceHref = sourceUrl.replace(/\.git$/, '')

    return new vscode.MarkdownString()
        .appendMarkdown(pkg.description + "\n\n")
        .appendMarkdown(`Installed version: ${pkg.version}` + "\n\n")
        .appendMarkdown(`[Packagist](https://packagist.org/packages/${pkg.name})`)
        .appendText(' | ')
        .appendMarkdown(`[${sourceText}](${sourceHref})`);
}
