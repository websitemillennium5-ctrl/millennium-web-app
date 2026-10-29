-- An optional picture on an announcement (a poster, a timetable, a photo from class).
-- Staff upload the original from the browser into the `announcement-images` bucket; the server then shrinks it
-- to a web-sized WebP (longest edge 1600 px), keeps that and deletes the original (src/app/admin/actions.ts).
-- The bucket is public: announcements are notices for students, object names are random UUIDs, and a plain URL
-- lets the web portal, next/image and the mobile app show the picture straight from the CDN without signing.

alter table public.announcements
  add column image_path   text,     -- object path in the announcement-images bucket
  add column image_width  integer,  -- pixel size of the stored (compressed) picture, for layout
  add column image_height integer;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'announcement-images',
  'announcement-images',
  true,
  15728640, -- 15 MB per original; what's kept is far smaller
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
)
on conflict (id) do nothing;
