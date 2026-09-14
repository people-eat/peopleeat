# Profile pictures

Users upload a square-cropped photo on the account page or chef profile edit page; it appears on profile overview and on public surfaces
that show the person. Cooks without a picture also see a getting-started step on `/profile`.

## Behavior

1. On `/profile/account`, `/admin/account`, `/admin/users/$userId` (general tab), or `/profile/chef-profile/edit`, choose an image (JPEG,
   PNG, WebP, or GIF). Admin uploads for another user reassign file ownership to that user on link.
2. Crop to a square in the dialog (drag, zoom, rotate on small screens), then apply.
3. The cropped image is compressed in the browser, uploaded, and linked to the user. Remove clears the link and deletes the stored file.
4. Profile overview shows the picture or initials. Public pages can load the image without a session when it is the user’s current profile
   picture.

## Decisions

### Alternatives considered

| Option                                                                      | Notes                                                              |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| GraphQL multipart upload + local static files + server-side resize variants | Orphan files; unbounded upload size; fights central file storage   |
| Stored URL string on user                                                   | Host coupling; no lifecycle with uploads                           |
| File upload FK + client crop and compress                                   | Matches shared storage; REST upload then link by id                |
| Server-side normalize on first upload                                       | Deferred; client quality ladder + type allowlist sufficient for v1 |

### Chosen

Central file uploads with client crop and compress before link; server asserts ownership and image types on update.

## Implementation

- DB: `Users.profilePictureFileUploadId` → `FileUploads` (`onDelete: set null`). FK in SQL migration only (circular with
  `FileUploads.userId`).
- GraphQL: `User.profilePicture: FileUpload`; `UserUpdate.profilePictureFileUploadId` (nullable clears). Patch requires at least one of name
  or picture id.
- Upload: `POST /api/file-uploads` (10 MB cap). Link via `userUpdate` + `fileUploadAssertOwned`; replaces and deletes previous row.
- GET: public when referenced as the user’s current profile picture (plus owner / published content / admin rules).
- UI: `ImageCropDialog` + `imageCropCompress` (react-easy-crop). Variants avatar (square 512px ~400 KB), logo (16:9 landscape 1280px ~400
  KB), meal (square 1280px ~600 KB), content (square 1280px ~600 KB for content-section side-by-side images), contentWide (16:9 1600px ~700
  KB for standalone image sections). `objectFit="contain"` with dynamic min zoom; mobile sheet with pinch and rotate. Cook brand marks use
  the `logo` variant via `CookLogoEditor` on `/profile/public` — see [cook-profile.md](./cook-profile.md). Content page section images use
  `content` / `contentWide` via `ContentSectionsEditor` — see [content-sections.md](../architecture/content-sections.md).

Key files: `userUpdate.ts`, `adminUserUpdate.ts`, `fileUploadContentAccess.ts`, `ImageCropDialog.tsx`, `ProfilePictureEditor.tsx`,
`AccountPage.tsx`, `AdminUserGeneralSection.tsx`, `ProfileCookChefProfile*Page.tsx`, `ProfilePage*.tsx`.

See also [file-storage.md](../architecture/file-storage.md), [account.md](./account.md), [profile.md](./profile.md).
