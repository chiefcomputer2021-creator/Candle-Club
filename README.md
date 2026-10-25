# The Candle Club

Order book and ledger for a floral and candle decor business. Built with React, TypeScript, Vite and Firebase (Auth + Firestore).

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build into dist/
```

Firebase settings live in `.env` (see `.env.example`). If those values are blank, the app runs in **local-only mode** and saves to the browser's localStorage, with no sign-in.

## One-time Firebase setup

In the [Firebase console](https://console.firebase.google.com/project/candle-club-a49ac):

1. **Authentication** → Get started → Sign-in method → enable:
   - **Google**
   - **Email/Password**, and inside it also switch on **Email link (passwordless sign-in)**. Team invites are sent as sign-in links.
2. **Authentication → Templates**: set the public-facing name to "The Candle Club" so emails don't say "project-287138614093".
3. **Firestore Database** is created. Deploy the rules and the invites index:
   ```bash
   firebase login            # with an account that has access to candle-club-a49ac
   firebase deploy --only firestore
   ```

### Email limits on the free (Spark) plan

| Email | Per day |
| --- | --- |
| Verify email (new password accounts) | 1,000 |
| Password reset | 150 |
| Sign-in link (team invites) | **5** |

If the invite email limit is hit, use **Copy link** on the Team page and send it yourself; the invite works the same way. Adding billing (Blaze) raises it to 25,000/day.

## Teams and roles

The person who sets up the business is its **Owner**. Owners and admins invite people from the **Team** page.

| | Owner | Admin | Staff | Viewer |
| --- | :-: | :-: | :-: | :-: |
| See calendar and orders | ✓ | ✓ | ✓ | ✓ |
| Add/edit orders, record payments | ✓ | ✓ | ✓ | |
| Delete orders and payments | ✓ | ✓ | | |
| Finances and expenses | ✓ | ✓ | | |
| Business settings, backup, restore, clear | ✓ | ✓ | | |
| Invite people, change roles, remove people | ✓ | ✓ | | |

The table is defined in `src/lib/roles.ts` (UI) and enforced by `firestore.rules` (server). Change both together.

How joining works: an invite is stored under the person's email. They open the emailed link, or sign in with Google or a password using that email (password accounts must confirm their email first), and click **Join**.

## Local testing with emulators

```bash
firebase emulators:start --only auth,firestore      # needs Java 21+
VITE_USE_EMULATORS=1 npm run dev
```

## Deploy to Firebase Hosting

```bash
npm run build
firebase deploy --only hosting
```

Add your custom domain (if any) under Authentication → Settings → Authorised domains.

## Data layout

```
users/{uid}                          { bizId }
businesses/{bizId}                   { name, ownerUid, settings }
businesses/{bizId}/members/{uid}     { email, name, role }
businesses/{bizId}/invites/{email}   { role, invitedBy, ... }
businesses/{bizId}/orders/{id}       order, with its payments embedded
businesses/{bizId}/expenses/{id}     expense (owners and admins only)
```

Firestore's offline cache is on: the book opens instantly, edits made offline sync when the connection returns, and changes from another device appear live.

## Moving data from the old single-file version

In the old HTML app, open **Settings and data → Download backup**, then in this app use **Settings and data → Restore from backup**. If you used this app in local-only mode before signing in, the empty book offers **Import from this browser**.

## Project structure

```
src/
  App.tsx              picks local or cloud mode; sign-in → verify → team → book
  auth/                Firebase Auth context and sign-in screen
  team/                membership lookup, invites, join/verify screens
  data/                storage backends (Firestore, localStorage) and BookContext
  views/               Calendar, Orders, Finances, Team
  sheets/              order / expense / settings slide-overs
  components/          shell, icons, toasts, confirm dialog
  lib/                 types, constants, formatting, money maths, exports, sample data
```
# Candle-Club
