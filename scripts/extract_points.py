#!/usr/bin/env python3
"""
Extrai os PONTOS DE EMBARQUE únicos das planilhas IGUATEMI_L*_ENTRADA_OK.xlsx.

LGPD: nome e matrícula dos passageiros NÃO são lidos nem gravados. Só saem
endereço, referência e a(s) linha(s) em que o endereço aparece.

Uso: python3 scripts/extract_points.py <pasta-com-xlsx> [saida.json]
"""
import glob, json, os, re, sys, hashlib
try:
    import openpyxl
except ModuleNotFoundError:
    sys.exit("openpyxl não instalado: rode `pip install openpyxl` (ou `pip install -r requirements.txt`).")

pasta = sys.argv[1] if len(sys.argv) > 1 else "."
saida = sys.argv[2] if len(sys.argv) > 2 else "data/pontos-origem.json"
pontos = {}

def parse(addr):
    ref = None
    m = re.search(r"\s[-–]\s*\((.+?)\)\s*$", addr)
    if m:
        ref, addr = m.group(1).strip(), addr[: m.start()].strip()
    partes = [p.strip() for p in addr.split(",")]
    if len(partes) == 3 and " - " in partes[0]:  # "Rua A / Rua B - Bairro, Cidade, UF"
        via, bairro_ = partes[0].rsplit(" - ", 1)
        partes = [via, bairro_, partes[1], partes[2]]
    if len(partes) < 4:
        return None
    uf, cidade, bairro = partes[-1], partes[-2], partes[-3]
    resto = partes[:-3]
    cruz = None
    numero = None
    if " / " in resto[0]:
        logradouro, cruz = [s.strip() for s in resto[0].split(" / ", 1)]
    else:
        logradouro = resto[0]
        if len(resto) > 1 and re.fullmatch(r"\d+", resto[1]):
            numero = resto[1]
    extra = [p for p in resto[1:] if p != numero]
    if extra:
        ref = ", ".join(extra + ([ref] if ref else []))
    return dict(logradouro=logradouro, numero=numero, cruzamento=cruz,
                bairro=bairro, cidade=cidade, uf=uf, referencia=ref)

arquivos = sorted(glob.glob(os.path.join(pasta, "IGUATEMI_L*_ENTRADA_OK.xlsx")))
if not arquivos:
    sys.exit(f"Nenhuma planilha IGUATEMI_L*_ENTRADA_OK.xlsx em '{pasta}'. Nada foi gravado (o arquivo existente foi preservado).")

for arq in arquivos:
    linha = re.search(r"(L\d+)", os.path.basename(arq)).group(1)
    wb = openpyxl.load_workbook(arq, data_only=True)
    for ws in wb:
        modo = None
        for row in ws.iter_rows(values_only=True):
            cab = row[3] if len(row) > 3 else None
            if isinstance(cab, str) and cab.startswith("Endereço ("):
                modo = "embarque" if "Embarque" in cab else "desembarque"
                continue
            if modo != "embarque" or not isinstance(row[0], int):
                continue
            if not isinstance(cab, str) or cab.startswith("http"):
                continue  # passageiro sem endereço informado
            end = re.sub(r"\s+", " ", cab).strip()
            chave = end.lower()
            p = pontos.setdefault(chave, {"enderecoOriginal": end, "linhas": set(), "passageiros": 0})
            p["linhas"].add(linha)
            p["passageiros"] += 1

lista = []
for chave, p in sorted(pontos.items()):
    d = parse(p["enderecoOriginal"])
    if d is None:
        print("IGNORADO (não é endereço):", p["enderecoOriginal"])
        continue
    lista.append({"id": "pt-" + hashlib.sha1(chave.encode()).hexdigest()[:10],
                  **d, "enderecoOriginal": p["enderecoOriginal"],
                  "linhas": sorted(p["linhas"]), "passageiros": p["passageiros"]})
os.makedirs(os.path.dirname(saida) or ".", exist_ok=True)
json.dump(lista, open(saida, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(f"{len(lista)} pontos únicos -> {saida}")
print("cruzamentos:", sum(1 for x in lista if x["cruzamento"]), "| com número:", sum(1 for x in lista if x["numero"]))
