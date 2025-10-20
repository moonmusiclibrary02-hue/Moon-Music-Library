import asyncio
from server import db, upload_to_gcs
from fastapi import UploadFile
from io import BytesIO
import aiofiles
import mimetypes
import logging
import os

logger = logging.getLogger(__name__)

async def migrate_track_to_gcs(track):
    """Migrate a single track's files from local storage to GCS."""
    updates = {}
    file_mappings = [
        ('mp3_file_path', 'mp3_blob_name', 'mp3_filename', 'audio'),
        ('lyrics_file_path', 'lyrics_blob_name', 'lyrics_filename', 'lyrics'),
        ('session_file_path', 'session_blob_name', 'session_filename', 'sessions'),
        ('singer_agreement_file_path', 'singer_agreement_blob_name', 'singer_agreement_filename', 'agreements'),
        ('music_director_agreement_file_path', 'music_director_agreement_blob_name', 'music_director_agreement_filename', 'agreements')
    ]

    for file_path_key, blob_key, filename_key, folder in file_mappings:
        file_path = track.get(file_path_key)
        if file_path and os.path.exists(file_path):
            try:
                # Read the file content
                async with aiofiles.open(file_path, 'rb') as f:
                    content = await f.read()

                # Create UploadFile object
                filename = track.get(filename_key, os.path.basename(file_path))
                file = UploadFile(
                    filename=filename,
                    file=BytesIO(content),
                    content_type=mimetypes.guess_type(filename)[0] or 'application/octet-stream'
                )

                # Upload to GCS
                blob_name = await upload_to_gcs(file, folder)
                updates[blob_key] = blob_name
                
                logger.info(f"Migrated {file_path} to GCS blob: {blob_name}")

            except Exception as e:
                logger.error(f"Failed to migrate file {file_path} for track {track.get('id')}: {str(e)}")

    if updates:
        await db.tracks.update_one({"_id": track["_id"]}, {"$set": updates})
        logger.info(f"Updated track {track.get('id')} with GCS blob references")

async def migrate_all_tracks():
    """Migrate all tracks' files from local storage to GCS."""
    async for track in db.tracks.find({}):
        await migrate_track_to_gcs(track)
        logger.info(f"Completed migration for track {track.get('id')}")

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(migrate_all_tracks())