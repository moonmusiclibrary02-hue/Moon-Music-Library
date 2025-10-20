import asyncio
import argparse
from server import db, upload_to_gcs
from fastapi import UploadFile
from io import BytesIO
import aiofiles
import aiofiles.os
import mimetypes
import logging
import os
from typing import Optional

logger = logging.getLogger(__name__)

def parse_args():
    """Parse command line arguments for migration control."""
    parser = argparse.ArgumentParser(description='Migrate track files from local storage to GCS')
    parser.add_argument('--dry-run', action='store_true',
                      help='Preview migration operations without making changes')
    parser.add_argument('--limit', type=int,
                      help='Limit the number of tracks to migrate')
    parser.add_argument('--track-id', type=str,
                      help='Migrate a specific track by ID')
    return parser.parse_args()

async def migrate_track_to_gcs(track, dry_run: bool = False):
    """
    Migrate a single track's files from local storage to GCS.
    
    Args:
        track: The track document to migrate
        dry_run: If True, only log operations without executing them
    """
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
        if not file_path:
            continue
            
        try:
            # Check file existence asynchronously
            exists = await aiofiles.os.path.exists(file_path)
            if not exists:
                logger.warning(f"File not found for migration: {file_path}")
                continue

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

            # Handle GCS upload
            if dry_run:
                logger.info(f"[DRY RUN] Would upload {file_path} to GCS in folder: {folder}")
                # Use a placeholder blob name for dry run
                blob_name = f"{folder}/{filename}"
            else:
                blob_name = await upload_to_gcs(file, folder)
                logger.info(f"Migrated {file_path} to GCS blob: {blob_name}")
            
            updates[blob_key] = blob_name

        except Exception:
            logger.exception(f"Failed to migrate file {file_path} for track {track.get('id')}")
            continue

    if updates:
        if dry_run:
            logger.info(f"[DRY RUN] Would update track {track.get('id')} with GCS references: {updates}")
        else:
            await db.tracks.update_one({"_id": track["_id"]}, {"$set": updates})
            logger.info(f"Updated track {track.get('id')} with GCS blob references")

async def migrate_all_tracks(dry_run: bool = False, limit: Optional[int] = None, track_id: Optional[str] = None):
    """
    Migrate tracks from local storage to GCS concurrently.
    
    Args:
        dry_run: If True, only simulate migration operations
        limit: Maximum number of tracks to migrate
        track_id: Optional specific track ID to migrate
    """
    # Create a semaphore to limit concurrent operations
    semaphore = asyncio.Semaphore(10)  # Allow up to 10 concurrent migrations
    
    # Build the query based on parameters
    query = {}
    if track_id:
        query["id"] = track_id
        
    # Fetch tracks into a list
    tracks = await db.tracks.find(query).to_list(length=limit)
    
    if track_id and not tracks:
        logger.error(f"Track with ID {track_id} not found")
        return
        
    if dry_run:
        logger.info("=== DRY RUN MODE - No changes will be made ===")
    
    logger.info(f"Found {len(tracks)} tracks to migrate{' (dry run)' if dry_run else ''}")
    
    async def worker(track):
        """Inner worker that processes a single track with semaphore."""
        try:
            async with semaphore:
                await migrate_track_to_gcs(track, dry_run=dry_run)
                status = "simulated" if dry_run else "completed"
                logger.info(f"{status.capitalize()} migration for track {track.get('id')}")
        except Exception as e:
            logger.error(f"Failed to migrate track {track.get('id')}: {str(e)}")
    
    # Create tasks for all tracks
    tasks = [worker(track) for track in tracks]
    
    # Run migrations concurrently and wait for all to complete
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    # Log final summary
    success_count = sum(1 for r in results if not isinstance(r, Exception))
    operation = "Simulated" if dry_run else "Completed"
    logger.info(f"{operation} migration: {success_count}/{len(tracks)} tracks processed successfully")

async def main():
    """Main entry point with CLI argument handling."""
    args = parse_args()
    
    # Initialize logging after parsing args
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s'
    )
    
    try:
        await migrate_all_tracks(
            dry_run=args.dry_run,
            limit=args.limit,
            track_id=args.track_id
        )
    except Exception as e:
        logger.exception("Migration failed")
        raise

if __name__ == "__main__":
    asyncio.run(main())