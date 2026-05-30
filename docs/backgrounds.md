# Background and theme system

The app has four themes in `app/page.js`:

- `warm`
- `midnight`
- `dust`
- `photo`

The visual backgrounds are controlled in `app/globals.css` through:

```css
.app-shell::before
.app-shell[data-theme="midnight"]::before
.app-shell[data-theme="dust"]::before
.app-shell[data-theme="photo"]::before
```

## Custom image background

Place an image at:

```txt
public/bg.jpg
```

Then open the app menu and choose `Photo`.

Recommended size:

```txt
1800px × 2400px or larger
```

Use a vertical image if most players will use phones.
