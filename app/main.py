from fastapi import FastAPI, Query, Request, HTTPException, Depends
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import FileResponse

import json
import os
import yt_dlp
from sqlalchemy.orm import Session
from . import models, database
from typing import Annotated
from urllib.request import urlopen
from urllib.parse import quote
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

app.mount("/static", StaticFiles(directory="static"), name="static")

DOWNLOAD_DIR = "static/audio"
os.makedirs(DOWNLOAD_DIR, exist_ok=True)

YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY")
YOUTUBE_SEARCH_URL = os.getenv("YOUTUBE_SEARCH_URL")

templates = Jinja2Templates(directory="templates")

def render(template_name: str, request: Request, context: dict = {}):
    context["request"] = request
    return templates.TemplateResponse(template_name, context)

models.Base.metadata.create_all(bind=database.engine)

# Dependency: This gets a DB session for a single request
def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

def create_song(data: dict, db: Session = Depends(get_db)):
    # 1. Create a new instance of your Model class
    new_row = models.Song(title=data["title"], uploader=data["uploader"], link=data["link"], path=data["path"])
    
    db.add(new_row)
    db.commit()
    db.refresh(new_row)
    
    return {"message": "User added successfully", "user": new_row}

def get_songs(db: Session = Depends(get_db)):
    songs = db.query(models.Song).all()
    return songs



@app.get("/songs/")
def read_songs(db: Session = Depends(get_db)):
    songs = get_songs(db=db)
    return songs


@app.get("/")
async def home(request: Request, db: Session = Depends(get_db)):
    songs = get_songs(db=db)
    context = {
        "data": songs
    }
    return render("index.html", request, context=context)


@app.get("/api")
async def api(q: Annotated[str, Query()]):
    url = f"{YOUTUBE_SEARCH_URL}?part=snippet&q={quote(q)}&type=video&key={YOUTUBE_API_KEY}"

    with urlopen(url) as response:
        data = json.loads(response.read())

    result = [
            {
                "id": item["id"]["videoId"],
                "title": item["snippet"]["title"],
                "uploader": item["snippet"]["channelTitle"],
                "link": f"https://www.youtube.com/watch?v={item['id']['videoId']}",
                "thumbnails": item["snippet"]["thumbnails"]
            } 
            for item in data.get("items", [])
        ]
    
    return result


@app.get("/download-audio")
async def download_youtube_audio(url: str, db: Session = Depends(get_db)):
    # Configuration for yt-dlp
    ydl_opts = {
        'format': 'bestaudio/best',
        'ffmpeg_location': 'app/bin',
        'outtmpl': f'{DOWNLOAD_DIR}/%(title)s.%(ext)s',
        'postprocessors': [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'mp3',
            'preferredquality': '192',
        }],
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            # Extract info and download
            info = ydl.extract_info(url, download=True)
    
            title = info.get('title', 'Unknown Title')
            uploader = info.get('uploader', 'Unknown Artist')

            # Construct the expected filename (yt-dlp changes extension to .mp3)
            audio_filename = ydl.prepare_filename(info).rsplit('.', 1)[0] + ".mp3"

            create_song(data={
                "title": title,
                "uploader": uploader,
                "link": url,
                "path": audio_filename
            }, db=db)
        
        return {
            "status": "success",
            "title": title,
            "uploader": uploader,
            "path": audio_filename, # This will be "/static/audio/filename.mp3"
            "filename": os.path.basename(audio_filename)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))