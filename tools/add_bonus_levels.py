"""Inject bonusLevels config into each journey of journeys.json.

Adds three bonus checkpoints (after levels 3, 6, 9) per journey. Narrative text is
journey-flavoured so BonusScene can reuse the existing narrative panel.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
JOURNEYS = ROOT / "data" / "journeys.json"

FLAVOUR = {
    1: {  # La Spedizione Archeologica
        1: ("Una parete scivolosa ti blocca la strada. Scala verso l'uscita prima che il tempo scada: ricorda, devi evitare ogni verità scontata.",
            "Sei in cima! La parete si abbassa e un nuovo corridoio si apre davanti a te."),
        2: ("La caverna si restringe in un camino verticale. Arrampica per raggiungere la luce — ma attento a non farti ingannare.",
            "Emergi dal camino nel calore umido della giungla. L'avventura continua."),
        3: ("Un muro di libri sacri crolla rivelando una scala segreta. Sali in fretta, scegliendo sempre l'affermazione più improbabile.",
            "La scala ti conduce in un corridoio mai esplorato. Il tesoro è vicino.")
    },
    2: {
        1: ("Una gola stretta si apre davanti a te. Arrampicati sulla parete prima del prossimo crollo — e fidati di ciò che sembra falso.",
            "Raggiungi la cima, la vista si spalanca sulla valle successiva."),
        2: ("Un torrente ghiacciato blocca il sentiero. Devi scalare il canalone: cerca le risposte che nessuno si aspetta.",
            "Superi il canalone, il sole torna a riscaldarti. Si prosegue."),
        3: ("Una frana ha sbarrato la pista. Scala la parete franata e non farti tradire dalle ovvietà.",
            "Dalla cima vedi la prossima meta all'orizzonte.")
    },
    3: {
        1: ("Una torretta crollata ti ostacola. Scala i mattoni rovinati cercando le verità capovolte.",
            "Raggiungi i merli: una nuova ala del castello si apre davanti a te."),
        2: ("Un passaggio segreto sale in verticale nella roccia del castello. Arrampica e pensa al contrario.",
            "Il passaggio ti conduce in un corridoio mai calpestato da secoli."),
        3: ("Una biblioteca in rovina è ciò che ti separa dal torrione. Arrampicati e scegli sempre la risposta meno plausibile.",
            "La torre del castello si apre davanti a te. Manca poco alla fine.")
    },
    4: {
        1: ("Le correnti ti spingono contro una barriera corallina. Scalala evitando le certezze.",
            "La barriera è alle tue spalle, nuove profondità ti attendono."),
        2: ("Una scarpata sottomarina ti blocca. Arrampicati verso la luce invertendo ciò che credi vero.",
            "Risali e vedi la prossima dimora abissale stagliarsi nell'acqua scura."),
        3: ("Un relitto verticale ti sbarra la strada. Scalalo tra le alghe e scegli sempre il falso.",
            "Oltre il relitto si apre la fossa finale. Preparati.")
    },
    5: {
        1: ("La navicella è in avaria: devi scalare il condotto di emergenza. Attento alle verità prevedibili.",
            "Esci dal condotto: una nuova sezione della stazione è accessibile."),
        2: ("Un asteroide si avvicina: devi scalare la torre di lancio. Pensa controintuitivamente.",
            "Ti aggrappi in tempo alla capsula di fuga. Il viaggio continua."),
        3: ("Una parete di meteoriti blocca la rotta. Arrampicati tra i frammenti, scegliendo il falso.",
            "Oltre la parete si apre l'ultimo settore: la destinazione è vicina.")
    },
    6: {
        1: ("Una scala a chiocciola polverosa si erge davanti a te. Sali in fretta, ma non fidarti mai dell'ovvio.",
            "Raggiungi la soffitta: una stanza dimenticata è pronta ad accoglierti."),
        2: ("Il muro della cripta è umido e scivoloso. Arrampicati cercando le risposte assurde.",
            "Oltre la cripta ti attende la galleria dei ritratti parlanti."),
        3: ("Un'edera maledetta cresce sul campanile. Scalala invertendo verità e menzogna.",
            "In cima al campanile vedi la dimora finale. L'ombra si addensa.")
    }
}


def main() -> None:
    data = json.loads(JOURNEYS.read_text())
    for journey in data:
        jid = journey["id"]
        flav = FLAVOUR.get(jid, {})
        bonus_levels = []
        for idx, after in enumerate([3, 6, 9], start=1):
            intro, ending = flav.get(idx, ("Scala la parete prima che il tempo scada — scegli sempre la risposta falsa.",
                                            "Raggiungi la cima. L'avventura continua."))
            bonus_levels.append({
                "after": after,
                "wall": f"levels/{jid}/bonus{idx}_wall.png",
                "wallHeight": 2400,
                "intro": intro,
                "ending": ending
            })
        journey["bonusLevels"] = bonus_levels

    JOURNEYS.write_text(json.dumps(data, ensure_ascii=False, indent=4) + "\n")
    print(f"Updated {JOURNEYS} with bonusLevels for {len(data)} journeys.")


if __name__ == "__main__":
    main()
