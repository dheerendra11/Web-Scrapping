// npm install init -y
// npm install minimist 
// npm install jsdom
// npm install excel4node
// npm install pdf-lib
// npm install axios

//  node web_scrapping.js --excel=worldcup2019.csv --pdf=worldcup2019 --source=https://www.espncricinfo.com/series/icc-cricket-world-cup-2019-1144415/match-results


let minimist = require("minimist");
let axios = require("axios");
let jsdom = require("jsdom");
let excel4node = require("excel4node");
let pdf = require("pdf-lib");
let fs = require("fs");
let path = require("path");
const { PDFField } = require("pdf-lib");

let args = minimist(process.argv);

let dld = axios.get(args.source);
dld.then(function(response){
    let html = response.data;
    let dom = new jsdom.JSDOM(html);
    let document = dom.window.document;
    let matchScoreDivs = document.querySelectorAll("div.match-score-block");
    let matches = [];
    for(let i = 0; i<matchScoreDivs.length; i++)
    {
        let match = {
            t1: "",
            t2: "",
            t1s: "",
            t2s: "",
            result: ""
        };

        let teamParas = matchScoreDivs[i].querySelectorAll("div.name-detail > p.name");
        match.t1 = teamParas[0].textContent;
        match.t2 = teamParas[1].textContent;

        let scorespan = matchScoreDivs[i].querySelectorAll("div.score-detail > span.score");

        if(scorespan.length == 2)
        {
            match.t1s = scorespan[0].textContent;
            match.t2s = scorespan[1].textContent;
        }
        else if(scorespan.length == 1)
        {
            match.t1s = scorespan[0].textContent;
            match.t2s = "0/0";
        }
        else if(scorespan.length == 0)
        {
            match.t1s = "0/0";
            match.t2s = "0/0";
        }
        
        let resultspan = matchScoreDivs[i].querySelector("div.status-text > span");
        match.result = resultspan.textContent;

        matches.push(match);

    }

  // console.log(matches);

  let matchesjson = JSON.stringify(matches);
  fs.writeFileSync("matches.json",matchesjson, "utf-8");

  let teams = [];
  for(let i = 0; i< matches.length; i++)
  {
      addteam(teams, matches[i].t1);
      addteam(teams, matches[i].t2);
  }

  for(let i = 0; i< matches.length; i++)
  {
      addmatch(teams, matches[i].t1 , matches[i].t2, matches[i].t1s, matches[i].t2s, matches[i].result);
      addmatch(teams, matches[i].t2 , matches[i].t1, matches[i].t2s, matches[i].t1s, matches[i].result);
      // console.log(matches[i]);
  }

  let teamjson = JSON.stringify(teams);
  fs.writeFileSync("teams.json",teamjson,"utf-8");

  excelfile(teams , args.excel);
  pdffile(teams, args.pdf);

})

function pdffile(teams , pdffilename)
{
 if(fs.existsSync(pdffilename)== true) 
 {
     fs.rmdirSync(pdffilename , {recursive: true})
 }  
 fs.mkdirSync(pdffilename);

 for(let i = 0; i< teams.length; i++)
 {
     let teamfoldername = path.join(pdffilename, teams[i].name);
     fs.mkdirSync(teamfoldername);
 
     for(let j = 0; j< teams[i].matches.length; j++)
        {
          let match = teams[i].matches[j];
          matchpdf(teamfoldername, teams[i].name , match);
        }        
 }

}

function matchpdf(teamfoldername , hometeam , match)
{
    let matchfile = path.join(teamfoldername,hometeam +"  vs  "+ match.vs)
    
    let templatebyte = fs.readFileSync("Template.pdf");
    let pdfdocm = pdf.PDFDocument.load(templatebyte);
    pdfdocm.then(function(pdfdoc){
        let page = pdfdoc.getPage(0);
      
        page.drawText("TEAM 1:   "+ hometeam,{
            x: 150,
            y: 675,
            size: 15
        });
        page.drawText("TEAM 2:   " + match.vs,{
            x: 150,
            y: 655,
            size: 15
        });
        page.drawText("TEAM'1 SCORE : " +match.team1score,{
            x: 150,
            y: 635,
            size: 15
        });
        page.drawText("TEAM'2 SCORE : " + match.team2score,{
            x: 150,
            y: 615,
            size: 15
        });
        page.drawText("RESULT : " +match.result,{
            x: 150,
            y: 595,
            size: 15
        });
        let changedbyte = pdfdoc.save();
        changedbyte.then(function(changedbytes){
            if(fs.existsSync(matchfile + ".pdf")== true)
            {
                fs.writeFileSync(matchfile + "1.pdf", changedbytes);
            }
            else
            {
                fs.writeFileSync(matchfile + ".pdf",changedbytes);
            }
        }) 

    })
}


function excelfile(teams , excelfilename)
{
    let wb = new excel4node.Workbook();

    for(let i = 0; i< teams.length; i++){
        let tsheet = wb.addWorksheet(teams[i].name);

        tsheet.cell(1,1).string("vs");
        tsheet.cell(1,2).string("team1score");
        tsheet.cell(1,3).string("team2score");
        tsheet.cell(1,4).string("result");

        for(let j = 0; j< teams[i].matches.length; j++)
        {
            tsheet.cell(2+j,1).string(teams[i].matches[j].vs);
            tsheet.cell(2+j,2).string(teams[i].matches[j].team1score);
            tsheet.cell(2+j,3).string(teams[i].matches[j].team2score);
            tsheet.cell(2+j,4).string(teams[i].matches[j].result);
        }
    }
    wb.write(excelfilename);
}

function addmatch(teams, team1 , team2 , team1score , team2score, result)
{
    let idx = -1;
    for(let i = 0; i< teams.length; i++)
    {
        if(teams[i].name == team1){
        tidx = i;
        break;
        }
    }
    let team = teams[tidx];
    team.matches.push({
        vs: team2,
        team1score: team1score,
        team2score: team2score,
        result: result
    })
}

function addteam(teams , teamname)
{
    let tidx = -1;
    for(let i = 0; i< teams.length; i++)
    {
        if(teams[i].name == teamname){
            tidx = i;
            break;
        }
    }

    if(tidx == -1)
    {
        teams.push({
            name: teamname,
            matches: []
        })
    }
}