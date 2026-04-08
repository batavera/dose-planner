import { useState, useEffect } from "react"
import insulina1ml from "./assets/insulina-1ml.png"
import insulina05ml from "./assets/insulina-05ml.png"
import pressao from "./assets/seringa-pressao-20ml.png"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { Trash2 } from "lucide-react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

type WeekPlan = {
  week: number
  dose: string
  applications: string
}

type Syringe = {
  id: string
  name: string
  unitsPerMl: number
  image: string
}

type Protocol = {
  name: string
  mg: string
  ml: string
  dose: string
  plan: WeekPlan[]
}

const syringes: Syringe[] = [
  { id: "1", name: "Insulina 1ml (100u)", unitsPerMl: 100, image: insulina1ml },
  { id: "2", name: "Insulina 0.5ml (50u)", unitsPerMl: 50, image: insulina05ml },
  { id: "3", name: "Seringa comum", unitsPerMl: 1, image: pressao },
]

function App() {
  const [mg, setMg] = useState("")
  const [ml, setMl] = useState("")
  const [dose, setDose] = useState("")
  const [protocolName, setProtocolName] = useState("")
  const [selectedSyringe, setSelectedSyringe] = useState(syringes[0])
  const [savedProtocols, setSavedProtocols] = useState<Protocol[]>([])
  const [editingIndex, setEditingIndex] = useState<number | null>(null)

  const [plan, setPlan] = useState<WeekPlan[]>([
    { week: 1, dose: "", applications: "" },
  ])

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("protocols") || "[]")
    setSavedProtocols(saved)
  }, [])

  const formatValue = (value: string) => {
    value = value.replace(",", ".")
    if (value.startsWith(".")) value = "0" + value
    return value
  }

  const concentration = Number(ml) > 0 ? Number(mg) / Number(ml) : 0

  const units =
    concentration > 0
      ? (Number(dose) / concentration) * selectedSyringe.unitsPerMl
      : 0

  const calculateRemaining = (index: number) => {
    let remaining = Number(mg) || 0

    for (let i = 0; i <= index; i++) {
      const d = Number(plan[i].dose) || 0
      const a = Number(plan[i].applications) || 0
      remaining -= d * a
    }

    return Math.max(remaining, 0)
  }

  const chartData = plan.map((_, i) => ({
    name: `Semana ${i + 1}`,
    restante: calculateRemaining(i),
  }))

  const clearAll = () => {
    setMg("")
    setMl("")
    setDose("")
    setProtocolName("")
    setPlan([{ week: 1, dose: "", applications: "" }])
    setEditingIndex(null)
  }

  const saveProtocol = () => {
    if (!protocolName.trim()) return

    const cleanPlan = plan.filter(
      (w) => w.dose !== "" && w.applications !== ""
    )

    const newProtocol: Protocol = {
      name: protocolName,
      mg,
      ml,
      dose,
      plan: cleanPlan,
    }

    const existing: Protocol[] = JSON.parse(
      localStorage.getItem("protocols") || "[]"
    )

    let updated

    if (editingIndex !== null) {
      updated = existing.map((p, i) =>
        i === editingIndex ? newProtocol : p
      )
      setEditingIndex(null)
    } else {
      updated = [...existing, newProtocol]
    }

    localStorage.setItem("protocols", JSON.stringify(updated))
    setSavedProtocols(updated)

    clearAll()
  }

  const exportProtocol = () => {
    if (!protocolName.trim()) {
      alert("Dê um nome ao protocolo")
      return
    }

    const fileName = prompt("Nome do arquivo:", protocolName)
    if (!fileName) return

    const doc = new jsPDF()

    // 🔷 HEADER
    doc.setFillColor(15, 23, 42)
    doc.rect(0, 0, 210, 30, "F")

    doc.setTextColor(255, 255, 255)
    doc.setFontSize(18)
    doc.text("Dose Planner Pro", 14, 16)

    doc.setFontSize(10)
    doc.text("by batavera", 14, 23)

    // 🔷 RESET COR
    doc.setTextColor(0, 0, 0)

    let y = 40

    // 🔷 TÍTULO
    doc.setFontSize(14)
    doc.text(`Protocolo: ${protocolName}`, 14, y)

    y += 10

    // 🔷 DADOS
    doc.setFontSize(11)
    doc.text(`Quantidade: ${mg} mg`, 14, y)
    y += 6
    doc.text(`Volume: ${ml} ml`, 14, y)
    y += 6
    doc.text(`Dose: ${dose} mg`, 14, y)

    y += 10

    const cleanPlan = plan.filter(
      (w) => w.dose !== "" && w.applications !== ""
    )

    autoTable(doc, {
      startY: y,
      head: [["Semana", "Dose", "Aplicações", "Restante"]],
      body: cleanPlan.map((w, i) => [
        `Semana ${i + 1}`,
        `${w.dose} mg`,
        `${w.applications}`,
        `${calculateRemaining(i).toFixed(2)} mg`,
      ]),
      styles: {
        fontSize: 10,
      },
      headStyles: {
        fillColor: [34, 197, 94], // verde bonito
        textColor: 255,
      },
      alternateRowStyles: {
        fillColor: [240, 240, 240],
      },
    })

    doc.save(`${fileName}.pdf`)
  }

  const loadProtocol = (p: Protocol, index: number) => {
    setMg(p.mg)
    setMl(p.ml)
    setDose(p.dose)
    setPlan(p.plan)
    setProtocolName(p.name)
    setEditingIndex(index)
  }

  const deleteProtocol = (index: number) => {
    const updated = savedProtocols.filter((_, i) => i !== index)
    localStorage.setItem("protocols", JSON.stringify(updated))
    setSavedProtocols(updated)
  }

  const updateWeek = (
    index: number,
    field: "dose" | "applications",
    value: string
  ) => {
    setPlan((prev) =>
      prev.map((w, i) =>
        i === index ? { ...w, [field]: value } : w
      )
    )
  }

  const addWeek = () => {
    const last = plan[plan.length - 1]

    if (!last.dose || !last.applications) {
      alert("Preencha a semana antes")
      return
    }

    setPlan((prev) => [
      ...prev,
      {
        week: prev.length + 1,
        dose: "",
        applications: "",
      },
    ])
  }

  const removeWeek = (index: number) => {
    if (plan.length === 1) return

    const updated = plan
      .filter((_, i) => i !== index)
      .map((w, i) => ({ ...w, week: i + 1 }))

    setPlan(updated)
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      <div className="grid lg:grid-cols-3 gap-6">

        {/* COLUNA 1 */}
        <div className="bg-slate-800 p-6 rounded-xl space-y-4">
          <h1 className="text-2xl font-bold text-center">
            💉 Dose Planner Pro
            <span className="block text-xs text-cyan-400 mt-1">
              by batavera
            </span>
          </h1>

          <div className="flex gap-2">
            <input
              value={protocolName}
              onChange={(e) => setProtocolName(e.target.value)}
              placeholder="Nome do protocolo"
              className="w-full p-2 rounded bg-slate-700"
            />

            <button onClick={saveProtocol} className="bg-cyan-500 px-4 rounded">
              {editingIndex !== null ? "Atualizar" : "Salvar"}
            </button>

            <button onClick={exportProtocol} className="bg-purple-500 px-4 rounded">
              Exportar
            </button>

            <button onClick={clearAll} className="bg-red-500 px-4 rounded">
              Limpar
            </button>
          </div>

          <input value={mg} onChange={(e) => setMg(formatValue(e.target.value))} placeholder="Quantidade (mg)" className="w-full p-2 rounded bg-slate-700" />
          <input value={ml} onChange={(e) => setMl(formatValue(e.target.value))} placeholder="Volume (ml)" className="w-full p-2 rounded bg-slate-700" />
          <input value={dose} onChange={(e) => setDose(formatValue(e.target.value))} placeholder="Dose (mg)" className="w-full p-2 rounded bg-slate-700" />

          <div className="text-center">
            <p className="text-green-400">{concentration.toFixed(2)} mg/ml</p>
            <p className="text-blue-400">{units.toFixed(0)} units</p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {syringes.map((s) => (
              <div key={s.id} onClick={() => setSelectedSyringe(s)}
                className={`p-3 rounded-xl cursor-pointer border ${selectedSyringe.id === s.id ? "border-cyan-400" : "border-slate-600"}`}>
                <img src={s.image} className="h-24 mx-auto object-contain" />
                <p className="text-xs text-center mt-2">{s.name}</p>
              </div>
            ))}
          </div>
        </div>

        {/* COLUNA 2 */}
        <div className="bg-slate-800 p-6 rounded-xl space-y-4">
          <h2 className="text-xl font-bold">Planejamento</h2>

          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <XAxis dataKey="name" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip />
              <Line type="monotone" dataKey="restante" stroke="#22c55e" />
            </LineChart>
          </ResponsiveContainer>

          {plan.map((w, i) => (
            <div key={i} className="group bg-slate-700 p-3 rounded space-y-2">
              <div className="flex justify-between">
                <p>Semana {i + 1}</p>
                <button onClick={() => removeWeek(i)} className="opacity-0 group-hover:opacity-100 text-red-400">
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="flex gap-2">
                <input value={w.dose}
                  onChange={(e) => updateWeek(i, "dose", formatValue(e.target.value))}
                  className="w-full p-2 rounded bg-slate-800"
                  placeholder="Dose"
                />
                <input value={w.applications}
                  onChange={(e) => updateWeek(i, "applications", e.target.value)}
                  className="w-full p-2 rounded bg-slate-800"
                  placeholder="Aplicações"
                />
              </div>

              <p>Restante: {calculateRemaining(i).toFixed(2)} mg</p>
            </div>
          ))}

          <button onClick={addWeek} className="w-full bg-cyan-500 p-2 rounded">
            + Semana
          </button>
        </div>

        {/* COLUNA 3 */}
        <div className="bg-slate-800 p-6 rounded-xl space-y-4">
          <h2 className="text-xl font-bold">Protocolos</h2>

          {savedProtocols.map((p, i) => (
            <div key={i} className="flex justify-between p-2 bg-slate-700 rounded">
              <span onClick={() => loadProtocol(p, i)} className="cursor-pointer">
                {p.name}
              </span>
              <button onClick={() => deleteProtocol(i)}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>

      </div>

      <div className="text-center text-xs text-slate-500 mt-6">
        © {new Date().getFullYear()} batavera — All rights reserved
      </div>
    </div>
  )
}

export default App