# Supabase Storage Setup for Product Images

The application expects an existing bucket named `product-images`. The backend does not create buckets or change Storage policies.

## Create the bucket

1. Open the project in the Supabase Dashboard and go to **Storage**.
2. Select **New bucket** and name it `product-images`.
3. Enable **Public bucket** so product cards and product details can display image URLs to buyers.
4. Restrict allowed MIME types to `image/jpeg`, `image/png`, and `image/webp`.
5. Set the maximum file size to **5 MB**.
6. Save the bucket.

Keep public uploads and public deletes disabled. All writes and deletes go through the backend after its Custom JWT, FARMER role, approved status, and product ownership checks. The backend uses `SUPABASE_URL` and `SUPABASE_SECRET_KEY`; do not put this server key in any `VITE_` variable or frontend bundle.

Until the bucket exists and is public, image upload requests will return an error and image URLs will not load. No Storage bucket or policy was created or changed by the application setup.
