# Export From Writefreely

[Writefreely][1] is a great blogging platform that you can install and tun on your own server. To give more peace of mind, this package allows you to export yoour posts into a collecton of markdown file that you can import into some other blogging platform.

Tou use this, you must have access to the command line on the server where you installed Writefreely and you must have NodeJS installed.

Intructions

1. `cd` to the parent directory containing your writefreely installation directory
2. `git clone git@github.com:eobrain/writefreely-export.git`
3. `git@github.com:eobrain/writefreely-export.git`
4. Optionally, if you are using nvm to control your versions of Node, do `nvm use`
5. `npm install`
6. `npm run export`
7. You will see a new directory called `content` containing your exported markdown files


[1]: https://writefreely.org/
