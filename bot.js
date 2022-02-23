//---------------------------------------- ENVIRONMENT SETUP --------------------------------------------------
require('dotenv').config()

const Discord = require("discord.js");
const {Client, Intents} = require("discord.js");
const moment = require("moment-timezone");
const fs = require("fs");
var AM = ''
var memberList = []

//---------------------------------------- CLIENT CREATION --------------------------------------------------

const client = new Client({partials: ["CHANNEL"], intents: [Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MEMBERS, Intents.FLAGS.DIRECT_MESSAGES, Intents.FLAGS.DIRECT_MESSAGE_REACTIONS]});
client.on("ready", async ()=> {
    //Logged on successfully 
    console.log(`Logged in as ${client.user.tag}!`)

    //Calculate time until next sunday
    let timeout =  timeUntilSunday()
    console.log(`Time until next Sunday Event: ${timeout}`)

    //Create member list
    members = await fetchMusicMembers('480931134222630912')
    memberList = members

    //Read if there is an active member
    initActive = readActiveMember()
    console.log(initActive + 'is the current member')
    
    //Create timeout for function
    let timerId = setTimeout(sundayEvent, timeout)
});

//---------------------------------------- MESSAGE HANDLING --------------------------------------------------

client.on("messageCreate", async msg => {

    
    //console.log(msg)
    if (msg.content === "ping") {
        msg.reply("pong")
    }

    if (msg.channel.type == "DM" && msg.author.id == AM) {
        await linkSubmission(msg)
    }

    if (msg.content === "debug_link") {
        console.log(link)
    }
});

client.login(process.env.TOKEN)


//---------------------------------------- HELPER FUNCTIONS --------------------------------------------------

async function fetchMusicMembers(guildID) {
    //Return human members of server that have the music role
    humanMembers = []
    const guild = client.guilds.cache.get(guildID)
    musicRole = await guild.roles.fetch()
    allMembers = await guild.members.fetch()
    allMembers.forEach(member => {
        if (member.user.bot == true){
        } else {
            if (member.roles.cache.some(role => role.id === '937041246231343175')) {
                humanMembers.push(member)
            } else {
            }
        }
    })
    return humanMembers
}

function timeUntilSaturday(){
    //Return milliseconds remaining until next Saturday
    let today = moment().tz('America/Los_Angeles')
    let noonNextSaturday = moment().day(13).tz('America/Los_Angeles').startOf("day").hour(12)
    let difference = moment.duration(noonNextSaturday.diff(today)).asMilliseconds()
    return difference
}

function timeUntilSunday(){
    //Return milliseconds remaining until next Sunday
    let today = moment().tz('America/Los_Angeles')
    let noonNextSunday = moment().day(7).tz('America/Los_Angeles').startOf("day").hour(12)
    let difference = moment.duration(noonNextSunday.diff(today)).asMilliseconds()
    return difference
}

function timeUntilTest(){
    //Return milliseconds remaining until next test
    let today = moment().tz('America/Los_Angeles')//.format('MMMM Do YYYY, h:mm:ss a')
    let hourFromNow = moment().tz('America/Los_Angeles').add(20, 'seconds') 
    let difference = moment.duration(hourFromNow.diff(today)).asMilliseconds()
    return difference
}

async function sundayEvent(){
    //Post this week's link to music channel, or warn if there wasn't a link submitted
    link = readLinkFile()
    if (link) {
        client.channels.cache.get("936667112729108582").send(`Here is this week's album!
    ${link}`)
        updateLinkFile('')
    } else {
        client.channels.cache.get("936667112729108582").send(`Oh no, there doesn't seem to be a link submitted for this week.`)
    }
    
    updateActiveMember('')

    //Validate if there are members, if not, restart list
    console.log(`First Call: ${memberList.length}`)
    if(memberList.length == 0) {
        console.log("Ran out of members, repopulating list...")
        memberList = await fetchMusicMembers('480931134222630912')
        console.log(`After repopulation: ${memberList.length}`)
    } 
    //Check if there is already an active member
    let activeMember = readActiveMember();
    if (!activeMember){
        //Get random user from member list
        member = memberList.pop(Math.floor(Math.random()*memberList.length));
        member = member.toString().replace(/[&\/\\#, +()$~%.'":*?<>{}@!<>]/g, '')
        console.log(`After Pop: ${memberList.length}`)
        console.log(`${member} has been selected for the week`)

        //Update week's active member
        updateActiveMember(member)
    } else {
        console.log(`${activeMember} has been selected for the week, using the File`)
    }

    //Read updated active member
    activeMember = readActiveMember();

    //Send message asking them to send link
    client.users.cache.get(activeMember).send(`Hello <@${activeMember}>. It is your turn to recommend an album of the week. Please reply to me before Friday with a YouTube Music link to the album.`);
    
    
    
    //Set timeout until next saturday noon PST
    let timeout =  timeUntilSaturday()
    console.log(`Time until next Sunday Event: ${timeout}`)
    timerId = setTimeout(saturdayEvent, timeout)
}

function saturdayEvent(){
    //If a link hasn't been submitted by saturday noon PST, remind user to send one
    link = readLinkFile()
    activeMember = readActiveMember()
    console.log(activeMember)
    if (!link){
        client.users.cache.get(activeMember).send(`Hello <@${activeMember}>. Please remember to submit a link before next Sunday!`);
    }
    
    //Set timeout until next sunday noon PST
    let timeout =  timeUntilSunday()
    console.log(`Time until next Sunday Event: ${timeout}`)
    timerId = setTimeout(sundayEvent, timeout)
}


async function linkSubmission(msg){
    //Initialize active memberw
    activeMember = readActiveMember();
    //Validate that message is a link
    if (msg.content.includes('youtube.com/')){
        //Validate user is sure that the selection is ok
        await msg.reply("Is this the link of the album you want to submit? React to this message with 👍 if yes, or react with 👎 if you wish to submit another link.")
        await msg.react('👍')
        await msg.react('👎')
        const filter = (reaction, user) => ((reaction.emoji.name === '👍' || reaction.emoji.name === '👎') && user.id === activeMember)
        collected = await msg.awaitReactions({filter, max: 1, time: 15000})
        let colEmoji = collected.first()
        if (!colEmoji){
            msg.reply("Something went wrong, please try again. React to the message with 👍 or 👎 only.")
            return
        }
        if (colEmoji.emoji.name == '👍'){
            //Update link file
            msg.reply("Thank you for your selection!")
            updateLinkFile(msg.content)
            console.log(`link updated to ${msg.content}`)
        } else {
            msg.reply("No worries, please submit another link.")
            return
        }
    } else { 
        msg.reply("Please submit a link for the Album of the Week.")
        return
    }
}

function updateLinkFile(link){
    //Update the text file with the provided link
    fs.writeFileSync('sundayLink.txt', link)
    console.log("Successfully wrote link to file")
}

function updateActiveMember(member){
    //Update the text file with the provided active member
    fs.writeFileSync('activeMember.txt', member)
    console.log("Successfully wrote active member to file")
    AM = member;
}

function readLinkFile(){
    //Read the text file and post the return the link string
    link = fs.readFileSync('./sundayLink.txt',
            {encoding:'utf8', flag:'r'});
    return link.toString()
}

function readActiveMember(){
   //Read the text file and post the return the active member for the week
    member = fs.readFileSync('./activeMember.txt',
            {encoding:'utf8', flag:'r'});
    console.log("reading file. member is " + member)
    AM = member;
    return member.toString()
}

//Test cases: 