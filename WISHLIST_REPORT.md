# Wishlist Feature Report

## Files Modified

- `backend/models/User.js`
- `backend/routes/wishlist.js`
- `backend/server.js`
- `frontend/src/App.jsx`
- `frontend/src/components/Navbar.jsx`
- `frontend/src/components/ProductCard.jsx`
- `frontend/src/context/AuthContext.jsx`
- `frontend/src/pages/Wishlist.jsx`

## New APIs Added

- `POST /api/wishlist/add`
- `DELETE /api/wishlist/remove/:id`
- `GET /api/wishlist`
- `GET /api/wishlist/count`

## Database Changes

- Wishlist data is stored in the existing `User.wishlist` MongoDB array.
- Each wishlist entry references a real `Product` document.
- Wishlist reads populate product image, name, category, price and stock fields from MongoDB.

## Bugs Fixed / Features Added

- Added heart icon support on product cards.
- Added outline/filled heart state based on MongoDB wishlist state.
- Added add/remove wishlist API calls with toast messages.
- Added wishlist persistence after page refresh by reloading from `/api/wishlist`.
- Added `/wishlist` customer route and page.
- Added product image, name, category, price, remove button and add-to-cart button on the Wishlist page.
- Added navbar wishlist count badge for customers.
- Cleared local wishlist state on logout to avoid stale customer data.

## Verification Results

- `npm run build` passed.
- Backend syntax checks passed for wishlist-related route files.
- Authenticated Atlas API test passed with real product `Veg Burger`:
  - Wishlist count before add: `0`
  - Wishlist count after add: `1`
  - Wishlist list result count: `1`
  - Wishlist count after remove: `0`
- Unauthenticated `/api/wishlist/count` correctly returned `401 Unauthorized`.

