-- An optional YouTube video on an announcement or a piece of study material. Staff paste the link in the
-- form; the student portal and mobile app embed it as a player (src/lib/video.ts parses the video id).

alter table public.announcements add column video_url text;
alter table public.study_materials add column video_url text;

-- Study material may now be just a video, with no file or other link.
alter table public.study_materials drop constraint study_materials_has_content;
alter table public.study_materials
  add constraint study_materials_has_content check (file_path is not null or link_url is not null or video_url is not null);
