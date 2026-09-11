// Board3D.tsx — Framer code component (paste into Framer: Assets → Code → New file)
// Drag-to-tilt specimen board with grain-catching light. Property controls for image, size, light.
import * as React from "react"
import { addPropertyControls, ControlType } from "framer"

export default function Board3D(props: { image: string; thickness: number; light: number; background: string }) {
    const { image, thickness, light, background } = props
    const [st, setSt] = React.useState({ rx: 62, ry: 0, tz: 0, drag: false })
    const W = 400, D = 400, T = thickness
    const L = light / 70
    const bf = 0.72 + L * 0.28
    const glossA = Math.max(0, Math.min(0.75, ((90 - st.rx) / 90 * 0.55 + 0.18) * L))
    const gx = 50 - st.ry * 1.2, gy = 30 - (st.rx - 62) * 0.8

    const down = (e: React.PointerEvent) => {
        e.preventDefault()
        const depth = e.button === 2 || e.shiftKey
        const s = { x: e.clientX, y: e.clientY, rx: st.rx, ry: st.ry, tz: st.tz }
        setSt(v => ({ ...v, drag: true }))
        const mv = (ev: PointerEvent) => setSt(v => depth
            ? { ...v, tz: Math.max(-420, Math.min(175, s.tz - (ev.clientY - s.y) * 0.8)) }
            : { ...v, rx: Math.max(18, Math.min(88, s.rx - (ev.clientY - s.y) * 0.25)), ry: s.ry + (ev.clientX - s.x) * 0.3 })
        const up = () => { setSt(v => ({ ...v, drag: false })); window.removeEventListener("pointermove", mv); window.removeEventListener("pointerup", up) }
        window.addEventListener("pointermove", mv); window.addEventListener("pointerup", up)
    }

    const face = (w: number, h: number, xform: string, style: React.CSSProperties = {}): React.CSSProperties => ({
        position: "absolute", left: "50%", top: "50%", width: w, height: h,
        margin: `${-h / 2}px 0 0 ${-w / 2}px`, transform: xform, backgroundColor: "#5f4430", overflow: "hidden", ...style,
    })
    const band: React.CSSProperties = {
        position: "absolute", left: "50%", top: "50%", width: T + 3, height: W + 3,
        margin: `${-(W + 3) / 2}px 0 0 ${-(T + 3) / 2}px`, transform: "rotate(90deg)",
        backgroundImage: `linear-gradient(90deg,rgba(35,31,27,.1),rgba(35,31,27,0) 30%,rgba(35,31,27,.16)),url(${image})`,
        backgroundSize: "100% 100%,cover", backgroundPosition: "center",
    }
    const edges: [string, number][] = [
        [`rotateX(-90deg) translateZ(${D / 2}px)`, 1],
        [`rotateX(-90deg) rotateY(180deg) translateZ(${D / 2}px)`, 0.82],
        [`rotateX(-90deg) rotateY(-90deg) translateZ(${W / 2}px)`, 0.9],
        [`rotateX(-90deg) rotateY(90deg) translateZ(${W / 2}px)`, 0.86],
    ]
    return (
        <div onPointerDown={down} onContextMenu={e => e.preventDefault()}
            style={{ width: "100%", height: "100%", position: "relative", background, borderRadius: 16, perspective: 1400, cursor: "grab", touchAction: "none", backgroundImage: "radial-gradient(rgba(29,29,29,.09) 1px,transparent 1px)", backgroundSize: "26px 26px" }}>
            <div style={{ position: "absolute", left: "50%", top: "52%", width: 0, height: 0, transformStyle: "preserve-3d", transition: st.drag ? "none" : "transform .5s cubic-bezier(.22,1,.36,1)", transform: `translateZ(${st.tz}px) rotateX(${st.rx}deg) rotateZ(${st.ry}deg)` }}>
                <div style={face(W, D, `translateZ(${T / 2 - 0.5}px)`, { backgroundImage: `url(${image})`, backgroundSize: "cover", backgroundPosition: "center", filter: `contrast(${0.88 + L * 0.2}) saturate(${0.92 + L * 0.12}) brightness(${0.94 + (L - 1) * 0.1})` })}>
                    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: `radial-gradient(760px 240px ellipse at ${gx}% ${gy}%,rgba(255,246,224,${glossA}),rgba(255,246,224,${glossA * 0.22}) 48%,transparent 72%),linear-gradient(${205 - st.ry}deg,transparent 46%,rgba(35,31,27,${glossA * 0.55}))` }} />
                </div>
                {edges.map(([xf, b], i) => (
                    <div key={i} style={face(i < 2 ? W : D, T, xf, { filter: `brightness(${(bf * b).toFixed(3)})` })}><div style={band} /></div>
                ))}
            </div>
        </div>
    )
}

Board3D.defaultProps = { image: "https://studio.sturij.com/showcase/finishes/alba-walnut.webp", thickness: 44, light: 70, background: "#FDFCF8" }
addPropertyControls(Board3D, {
    image: { type: ControlType.Image, title: "Finish" },
    thickness: { type: ControlType.Number, title: "Thickness", min: 12, max: 120 },
    light: { type: ControlType.Number, title: "Light", min: 20, max: 150 },
    background: { type: ControlType.Color, title: "Card" },
})
