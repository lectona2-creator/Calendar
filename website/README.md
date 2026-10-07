# Daily Ritual

A responsive browser-based supplement calendar. The app stores each update synchronously in localStorage and flushes the current snapshot on page exit, so data survives browser restarts and normal computer shutdowns.

## Run locally

```powershell
py -m http.server 8000
```

Then open `http://localhost:8000/website/` in a browser.

## Publish to GitHub Pages

The repository includes a GitHub Actions workflow that deploys the contents of this folder to GitHub Pages.

1. Create a GitHub repository and initialize this project as its repository.
2. Commit the project and push the main branch.
3. In GitHub, open **Settings → Pages**.
4. Select **GitHub Actions** as the source.
5. Push a change to the main branch. The workflow will publish the website automatically.
6. Open the generated Pages URL. The application will appear at the repository root, for example `https://username.github.io/repository-name/`.

## Features

- Monthly calendar with Monday-first layout
- Select a day and log supplements
- Add and remove supplements
- Restart-safe browser-local persistence
- Completed-days and streak statistics
- Responsive desktop and mobile layout
