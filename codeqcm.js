function UpdateOutput(event){
    let nbQuestions=17
    let scoreCoachs = [0, 0, 0, 0, 0] //0 : éole, 1 : matt,  2 : océ, 3 : sach, 4 : personne
    
    for (let i = 1; i<=nbQuestions; i++){
        scoreCoachs[document.querySelector('input[name="q'+i.toString()+'"]:checked').value]+=1
    }
    let bestCoach = scoreCoachs.indexOf(Math.max(...scoreCoachs));
    console.log(bestCoach)
    console.log(scoreCoachs)
    switch (bestCoach){
        case 0:
            document.getElementById("out").value = "Choisissez Eole";
            break;
        case 1:
            document.getElementById("out").value = "Choisissez Matthias";
            break;
        case 2:
            document.getElementById("out").value = "Choisissez Océane";
            break;
        case 3:
            document.getElementById("out").value = "Choisissez Saxha";
            break;
    }
}

function Pauvre(event){
    alert("Malheureusement votre budget est trop faible, nous vous conseillons de vous rediriger vers un coach en finance")
}

document.getElementById("calc").addEventListener("click", UpdateOutput)
document.getElementById("pauvre").addEventListener("click", Pauvre)
