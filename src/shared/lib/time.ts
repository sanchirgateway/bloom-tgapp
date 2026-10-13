// <input type="datetime-local"> работает со «стенными» часами без пояса ("2026-10-12T19:00").
// Время вводится в часовом поясе пользователя из профиля бота, а не браузера — как в /new.

function wallClockParts(ts: number, timeZone: string) {
	const parts = new Intl.DateTimeFormat('en-US', {
		timeZone,
		hourCycle: 'h23',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit'
	}).formatToParts(ts)
	const get = (type: Intl.DateTimeFormatPartTypes) =>
		Number(parts.find(p => p.type === type)!.value)
	return {
		year: get('year'),
		month: get('month'),
		day: get('day'),
		hour: get('hour'),
		minute: get('minute'),
		second: get('second')
	}
}

/** Смещение пояса относительно UTC в момент ts, мс */
function tzOffset(ts: number, timeZone: string) {
	const p = wallClockParts(ts, timeZone)
	const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second)
	return asUtc - Math.floor(ts / 1000) * 1000
}

/** "2026-10-12T19:00" в поясе timeZone → ISO в UTC */
export function wallClockToIso(value: string, timeZone: string) {
	const [date, time] = value.split('T')
	const [y, m, d] = date.split('-').map(Number)
	const [hh, mm] = time.split(':').map(Number)
	const guess = Date.UTC(y, m - 1, d, hh, mm)
	// Второй проход уточняет смещение рядом с переходом на летнее время
	let ts = guess - tzOffset(guess, timeZone)
	ts = guess - tzOffset(ts, timeZone)
	return new Date(ts).toISOString()
}

/** Момент времени → значение для datetime-local в поясе timeZone */
export function isoToWallClock(date: Date, timeZone: string) {
	const p = wallClockParts(date.getTime(), timeZone)
	const pad = (n: number) => String(n).padStart(2, '0')
	return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`
}

// --- Ввод с клавиатуры: на телефоне цифровая клавиатура, разделители ставим сами ---

/** "18102026" → "18.10.2026"; точку добавляем, только когда за ней есть цифры — иначе мешает стирать */
export function maskDate(raw: string) {
	const d = raw.replace(/\D/g, '').slice(0, 8)
	let out = d.slice(0, 2)
	if (d.length > 2) out += '.' + d.slice(2, 4)
	if (d.length > 4) out += '.' + d.slice(4)
	return out
}

/** "1930" → "19:30" */
export function maskTime(raw: string) {
	const d = raw.replace(/\D/g, '').slice(0, 4)
	return d.length > 2 ? `${d.slice(0, 2)}:${d.slice(2)}` : d
}

/** "18.10.2026" + "19:30" → "2026-10-18T19:30" для wallClockToIso; null — если такой даты или времени нет */
export function parseDateTime(date: string, time: string) {
	const dm = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(date)
	const tm = /^(\d{2}):(\d{2})$/.exec(time)
	if (!dm || !tm) return null
	const [, dd, mo, yyyy] = dm
	const [, hh, mi] = tm
	// Date.UTC сам «переносит» 31.02 в март — так и ловим несуществующие даты
	const check = new Date(Date.UTC(+yyyy, +mo - 1, +dd))
	if (check.getUTCDate() !== +dd || check.getUTCMonth() !== +mo - 1) return null
	if (+hh > 23 || +mi > 59) return null
	return `${yyyy}-${mo}-${dd}T${hh}:${mi}`
}
