# Profile pictures

Users upload a square-cropped photo on the account page or chef profile edit page; it appears on profile overview and on public surfaces
that show the person. Google and Facebook sign-up copy the provider photo when one is available. Cooks without a picture also see a
getting-started step on `/profile`.

## Behavior

1. Signing up with Google or Facebook imports the provider photo (when it is a real photo, not a default silhouette), shows it on the
   register step, and saves it as the profile picture when the account is created. Returning sign-in does not replace a picture that is
   already set. Users can still change or remove it later on the account page.
2. On `/profile/account`, `/admin/account`, `/admin/users/$userId` (general tab), or `/profile/chef-profile/edit`, choose an image (JPEG,
   PNG, WebP, or GIF). Admin uploads for another user reassign file ownership to that user on link.
3. Crop to a square in the dialog (drag, zoom, rotate on small screens), then apply.
4. The cropped image is compressed in the browser, uploaded, and linked to the user. Remove clears the link and deletes the stored file.
5. Profile overview shows the picture or initials. Public pages can load the image without a session when it is the user’s current profile
   picture.

## Decisions

### Alternatives considered

| Option                                                                      | Notes                                                                                                                                                |
| --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| GraphQL multipart upload + local static files + server-side resize variants | Orphan files; unbounded upload size; fights central file storage                                                                                     |
| Stored URL string on user                                                   | Host coupling; no lifecycle with uploads                                                                                                             |
| File upload FK + client crop and compress                                   | Matches shared storage; REST upload then link by id                                                                                                  |
| Server-side normalize on first upload                                       | Manual uploads stay client-side; OAuth imports encode 512px WebP with `sharp` at the callback so Facebook token-backed URLs are captured immediately |

### Chosen

Central file uploads with client crop and compress before link; server asserts ownership and image types on update. Google / Facebook
sign-up copies the provider photo into the same `FileUploads` store at the OAuth callback, then `userCreate` assigns ownership.

## Implementation

- DB: `Users.profilePictureFileUploadId` → `FileUploads` (`onDelete: set null`). FK in SQL migration only (circular with
  `FileUploads.userId`). Pending OAuth photos: `AuthOauthTickets.profilePictureFileUploadId` (`FileUploads.userId` null until register).
- GraphQL: `User.profilePicture: FileUpload` (metadata + URL only; bytes via GET `/api/file-uploads/:id`); `AuthOauthTicket.profilePicture`
  for the register preview; `UserUpdate.profilePictureFileUploadId` (nullable clears). Patch requires at least one of name or picture id.
- Upload: `POST /api/file-uploads` (10 MB cap). Link via `userUpdate` + `fileUploadAssertOwned`; replaces and deletes previous row. OAuth
  import: `authOauthProfilePictureImport` (allowlisted HTTPS hosts, size cap, `sharp` 512px WebP) then `authOauthTicketReplace`.
- GET: public when referenced as the user’s current profile picture (plus owner / published content / admin rules). The pending OAuth ticket
  photo is private to that session’s cookie.
- UI: `ImageCropDialog` + `imageCropCompress` (react-easy-crop). WebP presets: avatar (square 512px ~200 KB), logo (16:9 landscape 960px
  ~250 KB), meal (square 960px ~350 KB), content (square 960px ~350 KB for content-section side-by-side images), contentWide (16:9 1280px
  ~450 KB for standalone image sections). No-crop multi-select uploads use `imageCompress` with the `testimonial` preset (full-frame 1280px
  ~450 KB) — see [testimonials.md](./testimonials.md). `objectFit="contain"` with dynamic min zoom; mobile sheet with pinch and rotate. Cook
  brand marks use the `logo` variant via `CookLogoEditor` on `/profile/chef-profile/edit` — see [cook-profile.md](./cook-profile.md).
  Content page section images use `content` / `contentWide` via `ContentSectionsEditor` — see
  [content-sections.md](../architecture/content-sections.md). Delivery and follow-ups (upload-time variants, migration script, CDN):
  [image-delivery.md](../architecture/image-delivery.md).

Key files: `userUpdate.ts`, `adminUserUpdate.ts`, `userCreate.ts`, `authGoogleCallback.ts`, `authFacebookCallback.ts`,
`authOauthProfilePictureImport.ts`, `authOauthTicketReplace.ts`, `fileUploadContentAccess.ts`, `ImageCropDialog.tsx`,
`ProfilePictureEditor.tsx`, `AuthIdentityGate.tsx`, `AccountPage.tsx`, `AdminUserGeneralSection.tsx`, `ProfileCookChefProfile*Page.tsx`,
`ProfilePage*.tsx`.

See also [file-storage.md](../architecture/file-storage.md), [image-delivery.md](../architecture/image-delivery.md),
[account.md](./account.md), [profile.md](./profile.md).
