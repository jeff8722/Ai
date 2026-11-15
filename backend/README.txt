VESTIQ - SIX PRODUCT DATABASE CATALOGUE

This package contains six separate product image files and a SQLite database:
- Men: one shirt and one pair of pants
- Women: one blouse and one pair of pants
- Kids: one shirt and one pair of pants

No people or mannequins are included. Each image file contains one complete garment on a white background.

Database:
  catalogue.db

Images:
  products/

The database image paths use /media/<filename>.
For your existing FastAPI backend, place the six image files in the directory currently mounted at /media
(according to the original backend layout: backend/catalog/images/), and use catalogue.db as the database.
This is a six-product starter catalogue, not the earlier 62-product catalogue.
Prices are set to 0 as placeholders.
