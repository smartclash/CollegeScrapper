import {join} from "path";
import * as low from "lowdb";
import * as axios from "axios";
import * as cheerio from "cheerio";
import * as Filesync from "lowdb/adapters/FileSync";

let collegeDataUrls = [
    "https://engineering.careers360.com/colleges/list-of-engineering-colleges-in-india",
    "https://bschool.careers360.com/colleges/list-of-mba-colleges-in-india",
    "https://law.careers360.com/colleges/list-of-law-colleges-in-india",
    "https://hospitality.careers360.com/colleges/list-of-hospitality-tourism-colleges-in-india",
    "https://university.careers360.com/colleges/list-of-universities-in-india",
    "https://medicine.careers360.com/colleges/list-of-medical-colleges-in-india",
    "https://pharmacy.careers360.com/colleges/list-of-pharmacy-colleges-in-india",
    "https://it.careers360.com/colleges/list-of-bca-mca-colleges-in-india",
    "https://media.careers360.com/colleges/list-of-media-journalism-colleges-in-india"
];

// Initialize lowdb to save all data to a json file
const collegesAdapter = new Filesync(join(__dirname, '../data/colleges.json'));
const college = low(collegesAdapter);

college.defaults({ colleges: [] }).write();

/**
 * Calculates the pages off the pagination
 * 
 * @param htmlData
 */
const calculatePages = (htmlData) => {
    const $ = cheerio.load(htmlData);

    return Number($('.pagiInn > span').text().trim().split(' of ')[1]);
};

/**
 * Generates a link for each available page and then sends it to the actualThief
 * 
 * @param theLink
 */
const theRequester = async (theLink) => {
    const theResponse: axios.AxiosResponse = await actualThief(theLink).catch(err => console.log('[E] -> ERROR :', err));
    const totalPages = calculatePages(theResponse);

    for(let i = 1; i <= totalPages; i++) {
        const mainLink = theLink + "?sort=popularity&page=" + i;
        const rawCollegeData = await actualThief(mainLink);

        scrapeData(rawCollegeData);
        sleep(300); // we will be a good bot and wait before another request lol
    }
};

/**
 * The main brain, scrapes data from the plain html and saves it to the json file.
 * 
 * @param htmlData 
 */
const scrapeData = htmlData => {
    const $ = cheerio.load(htmlData);

    $('.cardBlk').each(function(_) {
        let city, state;

        const name = $(this).find('.cardContent > .content > .blockHeading > a').text().trim();
        $(this).find('.cardContent > .content > .rank > li').first().find('a').each(function (index) {
            (index == 0) ? city = $(this).text().trim() : state = $(this).text().trim();
        });

        console.log('[C] ->', name, city, state);
        college.get('colleges').push({name, city, state}).write();
    });
};

/**
 * The function responsible for requesting the HTML content from the link
 * 
 * @param link
 */
const actualThief = async (link) => {
    let {data} = await axios.default
        .get(link)
        .catch(err => console.log('[E] -> ERROR :', err));

    return data;
};

// Goes through each link and then sends it to theRequester which does it's work
collegeDataUrls.forEach(link => {
    theRequester(link);
});

/**
 * Makes the for loop sleep for sometime so that the site is not bombarded with requests from us.
 * 
 * @param milliseconds 
 */
const sleep = milliseconds => {
    const date = Date.now();
    let currentDate = null;

    do {
        currentDate = Date.now();
    } while (currentDate - date < milliseconds);
};
