const axios = require("axios").default;
const xml2js = require("xml2js");

const webhookURLs = [
    "웹훅 URL"
];
const avatarURL = "프로필 이미지 URL";

/**
 * 티스토리 RSS 가져오기
 * @param {String} rssURL 
 * @returns {{
 * title: String,
 * items: Array.<{
 *  title: String[],
 *  link: String[],
 *  description: String[],
 *  category: String[],
 *  author: String[],
 *  coments: String[],
 *  pubDate: String[]
 * }>}} Json
 */
async function getTistoryRSS(rssURL) {
    const rssXML = (await axios.get(rssURL)).data;
    const jsonData = await xml2js.parseStringPromise(rssXML);
    const rssObject = jsonData.rss.channel[0];

    return {
        "title": rssObject.title[0],
        "items": rssObject.item
    };
}

let lastPubDate = null;

exports.handler = async (event) => {
    try {
        // 티스토리 RSS를 Json으로 가져온다.
        const rss = await getTistoryRSS("https://answn.tistory.com/rss");

        // 초기 실행시 마지막으로 쓰인 글의 시간을 저장하고 끝낸다.
        if (lastPubDate == null) {
            lastPubDate = new Date(rss.items[0].pubDate[0]);
            return;
        }

        const embeds = [];
        rss.items.reverse().forEach(async (item) => {
            const currentPubDate = new Date(item.pubDate[0]);

            // 예전에 쓰여진 글이면 아무것도 하지않고 다음 글로 넘어간다.
            if (lastPubDate >= currentPubDate) return;
            lastPubDate = currentPubDate;

            // 새로 쓰여진 글이면 embed 객체로 배열에 넣고
            const category = (item.category == undefined) ? "" : item.category[0];
            embeds.push({
                "title": item.title[0],
                "url": item.link[0],
                "description": category,
                "color": 3447003
            });
        });

        // 배열을 한번에 웹훅으로 보낸다.
        if (embeds.length > 0) {
            for (const webhook of webhookURLs) {
                await axios.post(webhook, {
                    "embeds": embeds,
                    "username": "[알림] 카유 티스토리 새 글 업로드",
                    "avatar_url": avatarURL
                });
            }
        }
    }
    catch (err) {
        console.error(err);
    }

    const response = {
        statusCode: 200,
        body: JSON.stringify('Hello from Lambda!'),
    };
    return response;
}