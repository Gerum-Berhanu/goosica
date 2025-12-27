// const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const loadingHTMLDiv = document.createElement("div");
loadingHTMLDiv.innerHTML = `
    <div class="loader-cont">
        <div class="dot-spinner">
            <div class="dot-spinner__dot"></div>
            <div class="dot-spinner__dot"></div>
            <div class="dot-spinner__dot"></div>
            <div class="dot-spinner__dot"></div>
            <div class="dot-spinner__dot"></div>
            <div class="dot-spinner__dot"></div>
            <div class="dot-spinner__dot"></div>
            <div class="dot-spinner__dot"></div>
        </div>
    </div>
`;

const searchResultParent = document.getElementById("search-result-parent-cont");
const searchResultCont = document.getElementById("search-result-cont");
const songCont = document.getElementById("song-list-cont");
const searchInput = document.getElementById("search-input");
const searchButton = document.getElementById("search-button");

// Closing the search result when clicking on empty space
searchResultParent.addEventListener("click", (e) => {
    if (e.target == e.currentTarget) {
        if (!searchResultParent.classList.contains("hidden")) {
            searchResultParent.classList.add("hidden");
        }
    }
});

// Opening the search result when the search input is focused
searchInput.addEventListener("focusin", (e) => {
    // searchInput.parentElement.classList.add("z-40");
    if (searchResultCont.lastElementChild) {
        searchResultParent.classList.remove("hidden");
    }
});

function addSearch(song) {
    // to display the search results in the search modal
    const newElement = document.createElement("div")
    newElement.classList.add("flex", "gap-4", "flex-row", "justify-between", "w-full", "bg-zinc-800", "rounded-3xl", "p-4", "shadow-md", "border-2")
    newElement.innerHTML = `
        <div class="flex flex-col justify-center items-start">
            <span class="title-span text-lg text-green-500">${song["title"]}</span>
            <span class="uploader-span text-sm text-green-500/75">${song["uploader"]}</span>
        </div>

        <div class="flex justify-center items-center">
            <span url=${song["link"]} class="add-span text-xl cursor-pointer hover:text-green-500">+</span>
        </div>
    `;
    searchResultCont.appendChild(newElement);
}

async function addSong(span) {
    // when the plus icon next to each searched songs is clicked
    const grandParent = span.parentElement.parentElement;
    const songTitle = grandParent.querySelector(".title-span").textContent;
    const songUploader = grandParent.querySelector(".uploader-span").textContent;
    const songUrl = span.getAttribute("url");

    const newElement = document.createElement("div");
    newElement.classList.add("flex", "gap-4", "lg:flex-row", "flex-col", "justify-between", "w-full", "bg-zinc-800", "rounded-3xl", "p-4", "shadow-md")
    newElement.innerHTML = `
        <div
            class="flex lg:flex-col flex-row lg:justify-center justify-between lg:items-start items-center">
            <span class="text-lg text-green-500">${songTitle}</span>
            <span class="text-sm text-green-500/75">${songUploader}</span>
        </div>

        <div class="audio-cont hidden">
            <audio controls>
                Your browser does not support the audio element.
            </audio>
        </div>
    `;
    newElement.appendChild(loadingHTMLDiv);

    songCont.appendChild(newElement);

    span.remove();

    const resp = await fetch(`http://127.0.0.1:8000/download-audio?url=${encodeURIComponent(songUrl)}`, { method: "GET" });
    const data = await resp.json();

    // await sleep(5000);

    // data = {
    //     uploader: "Art of Yourself",
    //     path: "/static/audio/Beat It - Michael Jackson (Lyrics).mp3"
    // }

    const songPath = data["path"];

    const newSong = songCont.lastElementChild

    const loaderContParent = newSong.querySelector(".loader-cont").parentElement;
    loaderContParent.classList.add("hidden");
    loaderContParent.remove();

    const audioCont = newSong.querySelector(".audio-cont");
    audioCont.querySelector("audio").setAttribute("src", songPath);
    audioCont.classList.remove("hidden");
};

// When the search button is clicked
searchButton.addEventListener("click", async (e) => {
    const searchValue = document.getElementById("search-input").value;

    if (searchValue == "") {
        return;
    }

    // displaying loading animation until the data for the search is received
    searchResultCont.replaceChildren();
    searchResultParent.classList.remove("hidden");
    searchResultCont.appendChild(loadingHTMLDiv);
    searchResultCont.classList.add("justify-center");

    const respApi = await fetch(`http://127.0.0.1:8000/api?q=${searchValue}`, { method: "GET" });
    const dataApi = await respApi.json();

    // dataApi = [
    //     { title: "Michael Jackson - Beat It (Official 4K Video)", link: "https://www.youtube.com/watch?v=oRdxUFDoQe0", uploader: "Art of Yourself" },
    //     { title: "Beat It - Michael Jackson (Lyrics)", link: "https://www.youtube.com/watch?v=8fO8jVZ3T9g", uploader: "Art of Yourself" },
    //     { title: "Michael Jackson - Beat It (Official Video) [4K Remastered]", link: "https://www.youtube.com/watch?v=aV4ZFhIUGEU", uploader: "Art of Yourself" },
    //     { title: "Michael Jackson - Beat It // Lyrics + Espanol // Video Official", link: "https://www.youtube.com/watch?v=rCTasRG5nCI", uploader: "Art of Yourself" },
    //     { title: "Michael Jackson - Beat It (Lyrics)", link: "https://www.youtube.com/watch?v=T2PAkPp0_bY", uploader: "Art of Yourself" }
    // ];

    // await sleep(1000);

    searchResultCont.lastElementChild.remove();
    searchResultCont.classList.remove("justify-center");

    dataApi.forEach(song => {
        addSearch(song);
    });

    // Functionality of adding new songs to the main panel starts here
    const addSpanAll = document.querySelectorAll(".add-span");

    addSpanAll.forEach(span => {
        span.addEventListener("click", async (e) => {
            await addSong(span);
        });
    });
});