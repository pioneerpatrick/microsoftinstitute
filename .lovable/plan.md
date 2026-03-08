

## Plan: Update Course Thumbnail URLs in Database

The images are already saved in `public/images/courses/`. Now I need to update the `thumbnail_url` column for each matching course in the database.

### Mapping (10 courses with images → database IDs)

| Course | Image File | DB ID |
|--------|-----------|-------|
| Virtual Assistance | virtual-assistance.jpg | d720bda0... |
| Computer Applications | computer-applications.jpg | 506bc719... |
| Computer Programming | computer-programming.jpg | 6b9cd4da... |
| Accounting & Finance | accounting-finance.jpg | cd22f73f... |
| Business Administration | business-administration.jpg | 4b3767ad... |
| Business Communication Skills | business-communication.jpg | 313299f1... |
| Database Management | database-management.jpg | 1244069d... |
| Entrepreneurship | entrepreneurship.jpg | 304370bb... |
| Banking & Finance | banking-finance.jpg | deaea2e7... |
| Computerized Accounting | computerized-accounting.jpg | 213f1d92... |

### Steps
1. Run 10 UPDATE statements to set `thumbnail_url` to `/images/courses/<filename>.jpg` for each matching course
2. The remaining 18 courses without images will keep their current placeholder/gradient display

### Technical Detail
- The `FeaturedCourses` and `CourseCatalog` components already render `thumbnail_url` via `<img>` tags, so no code changes needed — only a data update.

