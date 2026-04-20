#!/usr/bin/env python3
"""Inject ending narrative text into each level of journeys.json."""
import json
import os

PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'journeys.json')

ENDINGS = {
    # 1 — La Spedizione Archeologica
    1: {
        1: "Hai attraversato la grande sala senza un graffio. I dardi sono rimasti nelle loro feritoie. Davanti a te si apre un passaggio di pietra che scende nelle profondità della terra.",
        2: "I cristalli smettono di tremare mentre superi l'ultima biforcazione. I loro riflessi ti accompagnano verso un corridoio dove l'aria diventa calda e umida: la giungla ti aspetta.",
        3: "Ti lasci alle spalle le liane e la maledizione. La vegetazione si dirada e un chiarore rossastro filtra tra gli alberi: un vulcano fuma in lontananza.",
        4: "Il ponte di pietra ha retto al calore. Dall'altra parte della caldera, un sentiero di cenere ti conduce a una porta antica, ricoperta di simboli di carta e inchiostro.",
        5: "Gli scaffali sono rimasti immobili. Tra i volumi polverosi scorgi un passaggio segreto: il freddo ne fuoriesce a folate.",
        6: "Le pareti di ghiaccio si spaccano davanti a te e rivelano un corridoio di sabbia e geroglifici. Il caldo ti avvolge di colpo mentre entri nelle catacombe.",
        7: "Le bende delle mummie ricadono inerti. Il soffitto di pietra si apre sul porto dimenticato: una nave fantasma ti aspetta.",
        8: "Il Kraken sprofonda negli abissi. La nave attracca a una torre altissima che si erge dalla foschia: l'alambicco dell'alchimista brilla in cima.",
        9: "L'ultima pozione non è esplosa. Una scala a chiocciola scende verso il cuore della montagna, dove il tesoro attende.",
        10: "Il pavimento ha retto. Davanti a te, la Camera del Tesoro si apre in tutto il suo splendore. Hai completato il viaggio che tuo prozio non aveva mai concluso."
    },
    # 2 — I Sentieri Selvaggi
    2: {
        1: "Gli ululati si allontanano. Hai lasciato la foresta alle tue spalle e il terreno sotto i tuoi piedi si fa molle: la palude ti aspetta.",
        2: "Hai superato le sanguisughe senza cadere nel fango. Il sentiero sale e l'aria si fa gelida: un lago ghiacciato brilla all'orizzonte.",
        3: "Il ghiaccio non si è spezzato. Raggiungi la riva opposta e il paesaggio cambia: una distesa abbagliante di sale si estende a perdita d'occhio.",
        4: "Gli scorpioni sono rimasti nascosti. Davanti a te si apre una profonda gola scavata dal fiume.",
        5: "La piena non ti ha travolto. Risalendo la parete della gola, raggiungi un crinale battuto dal vento: le aquile volteggiano sopra la tua testa.",
        6: "I massi sono rimasti al loro posto. Superi il passo di montagna e scendi in una conca rovente dove il terreno è coperto di squame.",
        7: "I serpenti si sono ritirati nelle loro tane. Il sibilo lascia spazio al fruscio dei bambù: una foresta verde e silenziosa si apre davanti a te.",
        8: "La tigre non ti ha trovato. Oltre i bambù, l'aria si fa umida e densa: radici enormi emergono da un'acqua torbida.",
        9: "Il coccodrillo è scomparso nell'oscurità. Esci dalla mangrovia su un sentiero in salita, ripido, verso la vetta coperta di nuvole nere.",
        10: "I fulmini hanno mancato il bersaglio. Sulla cima della montagna trovi il tuo vecchio maestro, seduto accanto a un piccolo falò, che ti sorride come se ti aspettasse."
    },
    # 3 — I Segreti del Castello
    3: {
        1: "L'olio bollente è rimasto nei calderoni. Superi il portone e scendi una scala di pietra che porta alle segrete.",
        2: "Le catene non si sono chiuse intorno a te. Risali dalle segrete e raggiungi una sala enorme, dominata da un trono vuoto.",
        3: "Nessuna botola ti ha inghiottito. Dal trono, una scala a chiocciola sale verso la torre di guardia.",
        4: "Le frecce sono rimaste nelle feritoie. Scendi dalla torre e segui l'odore di spezie fino alle cucine del re.",
        5: "Il calderone continua a ribollire alle tue spalle. Una porta secondaria della cucina conduce giù, nelle cripte.",
        6: "Il cavaliere spettrale si è dissolto nell'aria. Oltre la cripta, una piccola porta nascosta dietro un arazzo si apre su un giardino.",
        7: "I rovi si aprono davanti a te e si richiudono alle tue spalle. Una scala di pietra sale verso la sala delle armi.",
        8: "Le armi sono tornate al loro posto. Una crepa nella parete rivela un passaggio stretto e buio.",
        9: "Le pareti si fermano a un centimetro dal tuo corpo. Dopo un ultimo stretto passaggio, la saracinesca della camera del tesoro ti sbarra la strada.",
        10: "La saracinesca si alza. Hai attraversato tutto il castello. Oltre il tesoro si apre una porta che dà sul cortile: sei libera."
    },
    # 4 — Abissi e Profondità
    4: {
        1: "L'ancora resta ferma sul fondo. Tra le colonne del porto sommerso intravedi lo scafo squarciato di un vecchio galeone.",
        2: "I cannoni restano muti. Oltre il relitto, i colori di una barriera corallina esplodono nel blu.",
        3: "Le meduse si allontanano. Un'apertura nella roccia conduce dentro una grotta sottomarina.",
        4: "I ricci sono rimasti fermi tra le rocce. Lasci la grotta e raggiungi un fondale coperto di carcasse di navi.",
        5: "La nave fantasma scompare nella corrente. Il fondale scende a picco: la fossa abissale ti chiama.",
        6: "Il pesce abissale ritira la sua lanterna. Davanti a te, tra le tenebre, si scorgono colonne di marmo bianco.",
        7: "Il vortice si placa. Oltre il tempio di Atlantide, un giardino di alghe luminose si estende a perdita d'occhio.",
        8: "Le anguille elettriche si spengono. Il fondale si apre in una trincea fumante.",
        9: "I geyser si calmano. Oltre la trincea vulcanica, una cupola di vetro riflette la luce dei tuoi fari.",
        10: "La cupola ha retto. Risalendo in superficie, porti con te il segreto che il nonno aveva inseguito per tutta la vita."
    },
    # 5 — Odissea nello Spazio
    5: {
        1: "Gli sportelli di decompressione si sono stabilizzati. Ora una capsula di salvataggio ti porta sulla superficie lunare.",
        2: "I meteoriti hanno mancato il bersaglio. Risalito nel modulo, punti verso il pianeta rosso.",
        3: "La tempesta si placa. Lasci Marte alle tue spalle e la rotta ti porta verso gli anelli di Saturno.",
        4: "Gli asteroidi ti hanno sfiorato. Oltre gli anelli, una nebulosa colorata ti avvolge.",
        5: "La radiazione si dissolve nello spazio aperto. Un'ombra metallica fluttua nel buio: un relitto alieno.",
        6: "Il meccanismo alieno si spegne alle tue spalle. Entri in un campo di asteroidi fitto come una tempesta.",
        7: "Le collisioni sono evitate. Oltre il campo, lo spazio-tempo si distorce: un buco nero ti attrae.",
        8: "Superi l'orizzonte degli eventi senza essere spaghettificata. Dall'altra parte, un pianeta di cristalli brilla come un sole.",
        9: "I cristalli non si sono spezzati. Davanti a te si apre un portale cosmico: è l'ultima tappa.",
        10: "Il wormhole si stabilizza per un istante. Attraversi il portale e rivedi la Terra, piccola e azzurra. Sei a casa."
    },
    # 6 — La Dimora dei Fantasmi
    6: {
        1: "Il gargoyle resta immobile sul piedistallo. Il cancello si richiude alle tue spalle con un tonfo, ma davanti si apre un atrio illuminato da cento candele.",
        2: "Il lampadario continua a dondolare, ma resta appeso. Una porta laterale ti conduce in una sala rivestita di specchi.",
        3: "Il doppio maligno scompare quando giri le spalle. Oltre la sala degli specchi, l'aria profuma di carta antica: una biblioteca ti attende.",
        4: "Il libro posseduto si richiude. Una scala a chiocciola scende verso le cucine, dove il camino arde di fiamme verdi.",
        5: "Le fiamme infernali si spengono di colpo. Una botola nel soffitto si apre: sali nella soffitta dei giocattoli.",
        6: "La marionetta ricade senza vita. Dalla soffitta una porticina ti porta nella camera da letto padronale.",
        7: "L'incubo si dissolve senza prenderti. Oltre la camera, una scala scende nella cantina.",
        8: "Il gas velenoso si dirada. Dalla cantina, una porta ferrata dà sul giardino posteriore: la nebbia avvolge le lapidi.",
        9: "Le mani scheletriche rientrano nella terra. In fondo al cimitero si erge la torre dell'orologio: è l'ultima stanza.",
        10: "Gli ingranaggi si fermano con uno scossone. Il portone principale si apre da solo: l'alba comincia a illuminare il viale. Sei libera."
    }
}

with open(PATH, 'r', encoding='utf-8') as f:
    data = json.load(f)

for journey in data:
    jid = journey['id']
    for level in journey['levels']:
        lid = level['id']
        ending = ENDINGS.get(jid, {}).get(lid)
        if ending:
            # Insert ending right after narration by rebuilding dict
            new_level = {}
            for k, v in level.items():
                new_level[k] = v
                if k == 'narration':
                    new_level['ending'] = ending
            level.clear()
            level.update(new_level)

with open(PATH, 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=4, ensure_ascii=False)

print(f"Added endings to {sum(len(v) for v in ENDINGS.values())} levels.")
