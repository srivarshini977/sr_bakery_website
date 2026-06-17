# SR Bakery Test Cases

Generated after full-system QA smoke testing.

## Environment

- Backend: `http://localhost:5000`
- Frontend: `http://localhost:5173`
- Database: MongoDB `srbakery`
- Test date: 2026-06-13

## Startup And Build

| ID | Test Case | Expected Result | Status |
| --- | --- | --- | --- |
| ST-01 | Backend health endpoint `/api/health` | Returns `status: OK` | Passed |
| ST-02 | Backend syntax checks | No syntax errors | Passed |
| ST-03 | Frontend production build | Vite build succeeds | Passed |
| ST-04 | Dev servers | Backend listens on `5000`, frontend on `5173` | Passed |

## Authentication

| ID | Test Case | Expected Result | Status |
| --- | --- | --- | --- |
| AU-01 | Customer signup | User saved, JWT generated, role `customer` | Passed |
| AU-02 | Customer login | Valid credentials accepted | Passed |
| AU-03 | Invalid login | Rejected with `401` | Passed |
| AU-04 | Admin login | `admin@srbakery.com` works | Passed |
| AU-05 | Staff logins | Chef 1, Chef 2, Tea Masters, Cashier, Waiter work | Passed |

## Role Security

| ID | Test Case | Expected Result | Status |
| --- | --- | --- | --- |
| RS-01 | Customer accesses admin API | Blocked with `403` | Passed |
| RS-02 | Customer accesses staff API | Blocked with `403` | Passed |
| RS-03 | Staff accesses admin API | Blocked with `403` | Passed |
| RS-04 | Chef 2 views Chef 1 order | Not visible | Passed |
| RS-05 | Chef 2 updates Chef 1 order | Blocked with `403` | Passed |
| RS-06 | Staff mutates product/admin data | Blocked with `403` | Passed |

## Menu And Product

| ID | Test Case | Expected Result | Status |
| --- | --- | --- | --- |
| MP-01 | Menu product list | Products load with name/category/price | Passed |
| MP-02 | Product create as admin | Product created | Passed |
| MP-03 | Product edit as admin | Product updated | Passed |
| MP-04 | Product stock toggle as admin | Availability toggled | Passed |
| MP-05 | Product delete as admin | Product deleted | Passed |

## Checkout And Order Flow

| ID | Test Case | Expected Result | Status |
| --- | --- | --- | --- |
| OF-01 | Create customer order | Order saved with `Pending` status | Passed |
| OF-02 | Admin assign to Chef 1 | Status becomes assigned/visible to Chef 1 | Passed |
| OF-03 | Chef 1 updates `Preparing` | Database status updates | Passed |
| OF-04 | Chef 1 updates `Packed` | Database status updates | Passed |
| OF-05 | Admin updates `Shipped` | Database status updates | Passed |
| OF-06 | Admin updates `Delivered` | Database status updates | Passed |

## Staff Dashboard

| ID | Test Case | Expected Result | Status |
| --- | --- | --- | --- |
| SF-01 | Chef 1 sees assigned order | Order visible | Passed |
| SF-02 | Chef 2 does not see Chef 1 order | Order hidden | Passed |
| SF-03 | Staff can mark own order packed | Status updates | Passed |
| SF-04 | Staff cannot modify other staff order | Blocked | Passed |

## Notifications

| ID | Test Case | Expected Result | Status |
| --- | --- | --- | --- |
| NT-01 | Customer notifications load | Notification list returned | Passed |
| NT-02 | Mark notification read | Notification updates | Passed |
| NT-03 | Delete notification | Notification removed | Passed |
| NT-04 | Browser notification bell renders | No console errors | Passed |

## Inventory

| ID | Test Case | Expected Result | Status |
| --- | --- | --- | --- |
| IV-01 | Create inventory item | Item saved | Passed |
| IV-02 | Edit inventory item | Quantity updated | Passed |
| IV-03 | Delete inventory item | Item removed | Passed |
| IV-04 | Low-stock analytics | Alerts returned | Passed |

## Contact Messages

| ID | Test Case | Expected Result | Status |
| --- | --- | --- | --- |
| CM-01 | Submit contact form | Message saved | Passed |
| CM-02 | Mark read | Status becomes `read` | Passed |
| CM-03 | Mark unread | Status becomes `new` | Passed |
| CM-04 | Delete message | Message removed | Passed |

## Reviews

| ID | Test Case | Expected Result | Status |
| --- | --- | --- | --- |
| RV-01 | Staff submits customer review | Blocked | Passed |
| RV-02 | Delivered customer order review | Review saved | Passed |
| RV-03 | Ratings 1 to 5 | All accepted | Passed |
| RV-04 | Public reviews endpoint | Returns reviews array | Passed |

## Reports

| ID | Test Case | Expected Result | Status |
| --- | --- | --- | --- |
| RP-01 | Sales PDF | File returned | Passed |
| RP-02 | Sales Excel | File returned | Passed |
| RP-03 | Product Sales Excel | File returned | Passed |
| RP-04 | Inventory Excel | File returned | Passed |
| RP-05 | Customer Excel | File returned | Passed |
| RP-06 | Staff Excel | File returned | Passed |

## Browser And Responsive

| ID | Test Case | Expected Result | Status |
| --- | --- | --- | --- |
| BR-01 | Home page loads | Branding visible | Passed |
| BR-02 | Menu page loads | Product cards visible | Passed |
| BR-03 | Admin login UI flow | Redirects to admin dashboard | Passed |
| BR-04 | Admin overview cards | Cards render | Passed |
| BR-05 | Orders section | Renders on demand | Passed |
| BR-06 | Messages page | Renders | Passed |
| BR-07 | Mobile viewport | Body visible/no crash | Passed |
| BR-08 | Tablet viewport | Body visible/no crash | Passed |
| BR-09 | Desktop viewport | Body visible/no crash | Passed |
| BR-10 | Console/network errors | No console errors or failed requests | Passed |

## Reusable Smoke Commands

```bash
node scripts/qa_smoke_test.mjs
cd C:\Users\VARSHINI\.agents\skills\playwright
node run.js E:\SRBAKERY\scripts\browser_qa_test.cjs
```
