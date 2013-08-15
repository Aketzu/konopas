/* Copyright (c) 2013, Eemeli Aro <eemeli@gmail.com>

Permission to use, copy, modify, and/or distribute this software for any 
purpose with or without fee is hereby granted, provided that the above 
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH 
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND 
FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, 
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM 
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR 
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR 
PERFORMANCE OF THIS SOFTWARE.
*/


var full_version = !navigator.userAgent.match(/Android [12]/);
var default_duration = 60;
var time_show_am_pm = false;


// ------------------------------------------------------------------------------------------------ utilities

function EL(id) { return document.getElementById(id); }

function selected_id(parent_id) {
	var par = EL(parent_id); if (!par) return "";
	var sel = par.getElementsByClassName("selected"); if (!sel.length) return "";
	return sel[0].id;
}

function pre0(n) { return (n < 10 ? '0' : '') + n; }

function string_time(t) {
	if (!t) t = new Date();
	return t.getFullYear()
		+ '-' + pre0(t.getMonth() + 1)
		+ '-' + pre0(t.getDate())
		+ ' ' + pre0(t.getHours())
		+ ':' + pre0(t.getMinutes());
}

function pretty_time(t) {
	var d = [ 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday' ][t.getDay()];
	if (time_show_am_pm) {
		var h12 = t.getHours() % 12; if (h12 == 0) h12 = 12;
		return d + ', ' + h12 + ':' + pre0(t.getMinutes()) + (t.getHours() < 12 ? ' am' : ' pm');
	} else {
		return d + ', ' + t.getHours() + ':' + pre0(t.getMinutes());
	}
}

function time_sum(t0_str, m_str) {
	var t1 = 60 * t0_str.substr(0,2) + 1 * t0_str.substr(3,2) + 1 * m_str;
	var h = (t1 / 60) >> 0;
	var m = t1 - 60 * h;
	return pre0(h % 24) + ':' + pre0(m);
}

function supports_localstorage() {
	try {
		return 'localStorage' in window && window['localStorage'] !== null;
	} catch (e) {
		return false;
	}
}

function storage_get(name) {
	if (!supports_localstorage()) return false;
	var v = localStorage.getItem(konopas_set.id + '.' + name);
	return v ? JSON.parse(v) : v;
}

function storage_set(name, value) {
	if (!supports_localstorage()) return;
	localStorage.setItem(konopas_set.id + '.' + name, JSON.stringify(value));
}

function toggle_star(el, id) {
	var stars = storage_get('stars') || [];
	if (el.classList.contains("has_star")) {
		stars = stars.filter(function(el) { return el != id; });
		el.classList.remove("has_star");
	} else {
		stars[stars.length] = id;
		el.classList.add("has_star");
	}
	stars.sort();
	storage_set('stars', stars);
}

function GlobToRE(pat) {
	var re_re = new RegExp('[.\\\\+*?\\[\\^\\]$(){}=!<>|:\\/-]', 'g');
	pat = pat.replace(re_re, '\\$&').replace(/\\\*/g, '.*').replace(/\\\?/g, '.');

	var terms = pat.match(/"[^"]*"|'[^']*'|\S+/g).map(function(el){
		var t = '\\b' + el.replace(/^(['"])(.*)\1$/, '$2') + '\\b';
		return t; //.replace('\\b.*', '').replace('.*\\b', '');
	});

	return new RegExp(terms.join('|'), 'i');
}

var views = [ "next", "star", "prog", "part", "info" ];
function set_view(new_view) {
	for (var i in views) { document.body.classList.remove(views[i]); }
	document.body.classList.add(new_view);
	storage_set('view', new_view);
}



// ------------------------------------------------------------------------------------------------ items

function show_info(item, id) {
	if (EL("e" + id)) return;

	var html = "";
	var a = program.filter(function(el) { return el.id == id; });
	if (a.length < 1) html = "Program id <b>" + id + "</b> not found!";
	else {
		if (('tags' in a[0]) && a[0].tags.length) {
			var at = a[0].tags.map(function(t) { return '<a href="#prog/tag:' + t/*.toLowerCase().replace(/\W+/g, '-')*/ + '">' + t + '</a>'; });
			if (at.length) html += '<div class="item-tags">Tags: ' + at.join(', ') + '</div><br>\n';
		}
		if ('people' in a[0]) {
			var ap = a[0].people.map(function(p) { return "<a href=\"#part/" + p.id + "\">" + p.name + "</a>"; });
			if (ap.length > 0) html += /*"Participants: " +*/ ap.join(", ") + "\n";
		}
		if (a[0].desc) html += "<p>" + a[0].desc + "</p>";
	}
	item.innerHTML += "<div class=\"extra\" id=\"e" + id + "\">" + html + "</div>";
}

function show_prog_list(ls) {
	var list = [];
	var prev_date = "", day_str = "", prev_time = "";
	for (var i = 0; i < ls.length; ++i) {
		if (ls[i].date != prev_date) {
			prev_date = ls[i].date;
			prev_time = "";

			var t = new Date(ls[i].date);
			day_str = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][t.getUTCDay()];
			var td = t - Date.now();
			if ((td < 0) || (td > 1000*3600*24*6)) {
				day_str += ', ' + t.getUTCDate() + ' ' + ['January','February','March','April','May','June','July','August','September','October','November','December'][t.getUTCMonth()];
				if (Math.abs(td) > 1000*3600*24*60) day_str += ' ' + t.getUTCFullYear();
			}
			list[list.length] = '<div class="new_day">' + day_str + '</div>';
		}

		var time_str = "";
		if (ls[i].time != prev_time) {
			time_str = prev_time = ls[i].time;

			list[list.length] = '<hr /><div class="new_time" data-day="' + day_str.substr(0,3) + '">' + time_str + '</div>';
		}

		var loc_str = '';
		if (ls[i].loc.length) {
			loc_str = ls[i].loc[0];
			if (ls[i].loc.length > 1) loc_str += ' (' + ls[i].loc.slice(1).join(', ') + ')';
		}
		if (ls[i].mins && (ls[i].mins != default_duration)) {
			if (loc_str) loc_str += ', ';
			loc_str += ls[i].time + ' - ' + time_sum(ls[i].time, ls[i].mins);
		}

		list[list.length] = '<div class="item_frame"><div class="item_star" id="s' + ls[i].id + '"></div>'
			+ '<div class="item" id="p' + ls[i].id + '">'
			+ '<div class="title">' + ls[i].title + '</div>'
			+ '<div class="loc">' + loc_str + '</div>'
			+ '</div></div>';
	}
	EL("prog_ls").innerHTML = list.join('');

	var items = EL("prog_ls").getElementsByClassName("item");
	for (var i = 0; i < items.length; ++i) {
		items[i].onclick = function() {
			if (this.classList.contains("expanded")) {
				this.classList.remove("expanded");
			} else {
				this.classList.add("expanded");
				show_info(this, this.id.substr(1));
			}
			return true;
		};
	}

	if (supports_localstorage()) {
		var star_els = EL("prog_ls").getElementsByClassName("item_star");
		for (var i = 0; i < star_els.length; ++i) {
			star_els[i].onclick = function() { toggle_star(this, this.id.substr(1)); return false; };
		}

		var stars = storage_get('stars') || [];
		for (var i = 0; i < stars.length; ++i) {
			var el = EL('s' + stars[i]);
			if (el) el.classList.add("has_star");
		}
	}
}



// ------------------------------------------------------------------------------------------------ next view

function update_next_select(t_off) {
	var t = new Date();
	var h_now = t.getHours();
	var lt = [];
	t.setHours(h_now - 12);
	for (var i = -12; i <= 12; ++i) {
		lt[lt.length] = '<option value="' + i + '"' + (i == t_off ? ' selected' : '') + '>' + pretty_time(t) + '</option>';
		t.setHours(t.getHours() + 1);
	}
	var ts = EL("next_time");
	ts.innerHTML = lt.join("\n");
	ts.onchange = update_next_list;
}

function update_next_list(next_type) {
	var ls = EL("next_time");
	var t_off = (ls.selectedIndex >= 0) ? parseInt(ls[ls.selectedIndex].value) : 0;
	if (!t_off) t_off = 0;
	update_next_select(t_off);

	var t = new Date();
	t.setHours(t.getHours() + t_off);
	var now_str = string_time(t);
	var now_date = now_str.substr(0, 10);
	var now_time = now_str.substr(11);

	t.setMinutes(t.getMinutes() - t.getTimezoneOffset()); // to match Date.parse() time below

	var next = {};
	var ms_next = 0;
	var ms_max = t.valueOf() + 60 * 60 * 1000;
	var n = 0;
	for (var i = 0; i < program.length; ++i) {
		var it = program[i];
		if (it.date < now_date) continue;
		if ((it.date == now_date) && (it.time < now_time)) continue;

		var ms_it = Date.parse(it.date + 'T' + it.time);
		if (!ms_next || (ms_it < ms_next)) ms_next = ms_it;

		if (next_type == "next_by_room") {
			if (next[it.loc[0]]) {
				if (next[it.loc[0]].date < it.date) continue;
				if ((next[it.loc[0]].date == it.date) && (next[it.loc[0]].time < it.loc[0])) continue;
			}
			next[it.loc[0]] = it;
		} else {
			if (ms_it <= ms_max) next['n' + (++n)] = it;
		}
	}

	var next_prog = [];
	for (var k in next) {
		next_prog[next_prog.length] = next[k];
	}

	var start_str = '';
	if (ms_next) {
		var min_next = Math.floor((ms_next - t) / 60000);
		if (min_next < 1) start_str = 'right now';
		else {
			start_str = 'in ';
			var h_next = Math.floor(min_next / 60);
			if (h_next >= 1) {
				min_next -= h_next * 60;
				start_str += h_next + ' hour' + ((h_next == 1) ? '' : 's') + ' and ';
			}
			start_str += min_next + ' minute' + ((min_next == 1) ? '' : 's');
		}
	}

	EL("next_start_note").innerHTML = start_str
		? 'The next program item starts ' + start_str + '.'
		: 'There are no more program items scheduled.';

	show_prog_list(next_prog);
}

function update_next_filters(next_type) {
	if (next_type != "next_by_room") next_type = "next_by_hour";
	var ul = EL("next_type").getElementsByTagName("li");
	for (var i = 0; i < ul.length; ++i) {
		if (ul[i].id == next_type) ul[i].classList.add("selected");
		else ul[i].classList.remove("selected");
	}

	storage_set('next', { 'next_type': next_type })
}

function next_filter(ctrl, item) {
	var next_type = selected_id("next_type");

	switch (ctrl) {
		case "next_type": next_type = item; break;
	}

	update_next_list(next_type);
	update_next_filters(next_type);
}


function show_next_view() {
	set_view("next");

	var next_type = "next_by_hour";

	var store = storage_get('next') || {};
	if ('next_type' in store) next_type = store.next_type;

	update_next_list(next_type);
	update_next_filters(next_type);
}



// ------------------------------------------------------------------------------------------------ "my con" view

function show_star_view() {
	set_view("star");

	var sh = EL("star_hint");
	if (supports_localstorage()) {
		var stars = storage_get('stars');
		if (stars && stars.length) {
			sh.innerHTML = '';
			var ls = program.filter(function(it) { return (stars.indexOf(it.id) >= 0); });
			show_prog_list(ls);
		} else {
			sh.innerHTML = "<b>Hint:</b> To \"star\" a program item, click on the gray square next to it. Your selections will be remembered, and shown in this view. You currently don't have any program items selected, so this list is empty."
			EL("prog_ls").innerHTML = '';
		}
	} else {
		sh.innerHTML = "HTML5 localStorage is apparently <b>not supported</b> by your current browser, so unfortunately the selection and display of starred items is not possible."
		EL("prog_ls").innerHTML = '';
	}
}




// ------------------------------------------------------------------------------------------------ program view

function update_prog_list(day, area, tag, freetext) {
	var re_t, re_q, re_hint, glob_hint = '', hint = '';
	if (tag) {
		var t = EL(tag) && EL(tag).getAttribute("data-regexp");
		if (t) re_t = new RegExp(t);
	}
	if (freetext) {
		re_q = GlobToRE(freetext);
		if (!freetext.match(/[?*"]/)) {
			glob_hint = freetext + '*';
			re_hint = GlobToRE(glob_hint);
		}
	}

	var ls = program.filter(function(it) {
		if (day && it.date != day) return false;

		if (area) switch (area) {
			case "everywhere": break;
			//case "other areas": if (it.loc.length > 1) return false; else break;
			default: if (it.loc.indexOf(area) < 0) return false;
		}

		if (tag && (tag != 'all_tags')) {
			if (re_t) {
				if (!re_t.test(it.title)) return false;
			} else {
				if (!it.tags || (it.tags.indexOf(tag) < 0)) return false;
			}
		}

		if (freetext) {
			var sa = [ it.title, it.desc, it.loc[0] ];
			if (it.people) for (var j = 0; j < it.people.length; ++j) sa[sa.length] = it.people[j].name;
			var sa_str = sa.join("\t");
			if (!sa_str.match(re_q)) {
				if (re_hint && !hint) {
					var r = sa_str.match(re_hint);
					if (r && r[0].match(/\S+/)) hint = r[0].match(/\S+/)[0];
				}
				return false;
			}
		}

		return true;
	});

	show_prog_list(ls);

	var dh = EL("q_hint");
	if (dh) {
		if (re_hint) {
			dh.innerHTML = "<b>Hint:</b> search is for full words, but you may also use * and ? as wildcards or \"quoted words\" for exact phrases.";
			if (hint) dh.innerHTML += " For example, "
				+ "<span href=\"#\" id=\"q_fix\" onmouseup=\"EL('q').value = '" + glob_hint + "'; prog_filter(); return true;\">"
				+ "searching for <b>" + glob_hint + "</b> would also match <b>" + hint + "</b></span>";
		} else {
			dh.innerHTML = "";
		}
	}

	storage_set('prog', { 'day': day, 'area': area, 'tag': tag, 'freetext': freetext });
}

function update_prog_filters(day, area, tag, freetext) {
	var dt = "d" + day;
	var dc = EL("day").getElementsByTagName("li");
	for (var i = 0; i < dc.length; ++i) {
		if (dc[i].id == dt) dc[i].classList.add("selected");
		else dc[i].classList.remove("selected");
	}
	if (!full_version && (area == "everywhere") && tag.match(/tags$/) && !freetext) {
		EL("d").classList.add("disabled");
	} else {
		EL("d").classList.remove("disabled");
	}

	var ft = area || "everywhere";
	var fc = EL("area").getElementsByTagName("li");
	for (var i = 0; i < fc.length; ++i) {
		if (fc[i].id == ft) fc[i].classList.add("selected");
		else fc[i].classList.remove("selected");
	}

	var tt = tag || "all_tags";
	var tc = EL("tag").getElementsByTagName("li");
	var t2_title = "More tags...";
	for (var i = 0; i < tc.length; ++i) {
		if (tc[i].id == tt) {
			tc[i].classList.add("selected");
			if (tc[i].parentNode.id == "tag2") t2_title = "<b>"+tc[i].innerHTML.trim()+"...</b>";
		} else tc[i].classList.remove("selected");
	}
	var t2t = EL("tag2-title"); if (t2t) t2t.innerHTML = t2_title;

	var qc = EL("q");
	if (qc) {
		qc.value = freetext;
		if (qc.value) qc.classList.add("selected");
		else qc.classList.remove("selected");
	}
}

function default_prog_day() {
	var day_start = program[0].date;
	var day_end = program[program.length-1].date;
	var day_now = string_time().substr(0, 10);

	var day = (day_now <= day_start) ? ''
	        : (day_now > day_end) ? ''
	        : day_now;

	return day;
}

function update_prog(day, area, tag, freetext) {
	if (!full_version && !day && (area == "everywhere") && tag.match(/tags$/) && !freetext) {
		day = default_prog_day();
	}

	console.log('update_prog '+day+' '+area+' '+tag+' '+freetext);

	var hash_in = window.location.hash;

	var parts_out = ['#prog'];
	if (day) parts_out.push('day:' + day);
	if (area && (area != 'everywhere')) parts_out.push('area:' + area);
	if (tag && (tag != 'all_tags')) parts_out.push('tag:' + tag);
	var hash_out = parts_out.join('/');

	console.log(hash_in+' > '+hash_out+(hash_in == hash_out ? ' ok' : ' redirect'));

	if (hash_in != hash_out) {
		window.location.hash = hash_out;
		return;
	}

	update_prog_list(day, area, tag, freetext);
	update_prog_filters(day, area, tag, freetext);
}

function prog_filter(ctrl, item) {
	var day = selected_id("day");
	var area = selected_id("area");
	var tag = selected_id("tag");
	var freetext = EL("q").value;

	if (item && !EL(item).classList.contains("disabled")) switch (ctrl) {
		case "day":  day = item; break;
		case "area": area = item; break;
		case "tag":  tag = item; break;
		case "tag2": tag = item; break;
	}

	day = day.substr(1);

	update_prog(day, area, tag, freetext);
}

function show_prog_view(opt) {
	var day = default_prog_day(), area = "everywhere", tag = "all_tags", freetext = "";

	if (!document.body.classList.contains("prog")) {
		set_view("prog");

		var store = storage_get('prog');
		if (store) {
			if ('day' in store) day = store.day;
			if ('area' in store) area = store.area;
			if ('tag' in store) tag = store.tag;
			if ('freetext' in store) freetext = store.freetext;
		}
	}

	if (opt) {
		var parts_in = opt.split('/');
		for (var i in parts_in) {
			var s = parts_in[i].split(':');
			if (s.length >= 2) switch (s[0]) {
				case 'day':  if (!day) day = s[1]; break;
				case 'area': if (!area) area = s[1]; break;
				case 'tag':  if (!tag) tag = s[1]; break;
			}
		}
	}

	update_prog(day, area, tag, freetext);
}



// ------------------------------------------------------------------------------------------------ participant view

function update_part_view(name_range, participant) {
	var el_nr = EL('name_range');
	if (el_nr) {
		var ll = el_nr.getElementsByTagName('li');
		for (var i = 0; i < ll.length; ++i) {
			if (ll[i].getAttribute('data-range') == name_range) ll[i].classList.add('selected');
			else ll[i].classList.remove('selected');
		}
	}

	var p_id = participant.substr(1);
	var pa = people.filter(function(p) { return p.id == p_id; });
	if (!pa.length) {
		participant = '';

		if (name_range) {
			var lp = people.filter(function(p) {
				var n = (p.name[1] + '  ' + p.name[0]).replace(/^ +/, '');
				var n0 = n[0].toUpperCase();
				switch (name_range.length) {
					case 1:  if (n0 == name_range[0])                            return true; break;
					case 2:  if ((n0 >= name_range[0]) && (n0 <= name_range[1])) return true; break;
					default: if (name_range.indexOf(n0) >= 0)                    return true; break;
				}
				return false;
			});

			lp.sort(function(a, b) {
				var an = (a.name[1] + '  ' + a.name[0]).toLowerCase().replace(/^ +/, '');
				var bn = (b.name[1] + '  ' + b.name[0]).toLowerCase().replace(/^ +/, '');
					 if (an < bn) return -1;
				else if (an > bn) return 1;
				else              return 0;
			});
			EL('part_names').innerHTML = lp.map(function(p) {
				return '<li><a href="#part/' + p.id + '">'
					+ '<span class="fn">' + (p.name[1] ? p.name[0] : '') + '</span> '
					+ '<span class="ln">' + (p.name[1] ? p.name[1] : p.name[0]) + '</span>'
					+ '</a></li>';
			}).join('');
		} else {
			EL('part_names').innerHTML = '';
		}
		EL('part_info').innerHTML = '';
		EL('prog_ls').innerHTML = '';
	} else {
		var links = '';
		if (pa[0].links) {
			links += '<dl class="linklist">';
			for (var type in pa[0].links) {
				var tgt = pa[0].links[type];
				switch (type) {
					case 'url': links += '<dt>URL:<dd>'
						+ '<a href="' + tgt + '">' + tgt + '</a>';
						break;
					case 'twitter': links += '<dt>Twitter:<dd>'
						+ '<a href="https://www.twitter.com/' + tgt + '">@' + tgt + '</a>';
						break;
					case 'fb': links += '<dt>Facebook:<dd>'
						+ '<a href="https://www.facebook.com/' + tgt + '">/' + tgt + '</a>';
						break;
					case 'img':
						break;
					default: links += '<dt>' + type + ':<dd>' + tgt;
				}
			}
			links += '</dl>';
		}
		EL("part_names").innerHTML = '';
		EL("part_info").innerHTML = 
			  '<h2 id="part_title">' + (pa[0].name[0] ? pa[0].name[0] : '') + ' ' + pa[0].name[1] + '</h2>' 
			+ (pa[0].links && pa[0].links.img ? ('<p><img class="bio_img" src="' + pa[0].links.img + '">') : '')
			+ (pa[0].bio ? ('<p>' + pa[0].bio) : '')
			+ links;
		show_prog_list(program.filter(function(it) { return pa[0].prog.indexOf(it.id) >= 0; }));
	}

	storage_set('part', { 'name_range': name_range, 'participant': participant });
}

function part_filter(ctrl, el) {
	var name_range = (ctrl == 'name_range') ? el.getAttribute("data-range") : '';
	update_part_view(name_range, '');
}

function find_name_range(name) {
	var n = (name[1] + '  ' + name[0]).toUpperCase().replace(/^ +/, ''); if (!n) return '';
	var par = EL('name_range'); if (!par) return '';
	var ll = par.getElementsByTagName('li'); if (!ll.length) return '';
	for (var i in ll) {
		var range = ll[i].getAttribute('data-range');
		switch (range.length) {
			case 0:  break;
			case 1:  if (n[0] == range[0])                         return range; break;
			case 2:  if ((n[0] >= range[0]) && (n[0] <= range[1])) return range; break;
			default: if (range.indexOf(n[0]) >= 0)                 return range; break;
		}
	}
	return '';
}

function show_part_view(opt) {
	var name_range ='', participant = '';

	var store = storage_get('part') || {};
	if ('name_range' in store) name_range = store.name_range;

	if (!document.body.classList.contains("part")) {
		set_view("part");

		if ('participant' in store) participant = store.participant;
	}

	if (opt) {
		var p_id = opt.substr(1);
		var pa = people.filter(function(p) { return p.id == p_id; });
		if (pa.length) {
			participant = 'p' + pa[0].id;
			name_range = find_name_range(pa[0].name);
		} else {
			window.location.hash = '#part';
			return;
		}
	} else if (participant) {
		window.location.hash = '#part/' + participant.substr(1);
		return;
	}

	if (!name_range) name_range = EL('name_range').getElementsByTagName('li')[0].getAttribute('data-range');

	update_part_view(name_range, participant);
}



// ------------------------------------------------------------------------------------------------ info view

function show_info_view() {
	set_view("info");

	EL("prog_ls").innerHTML = "";
}



// ------------------------------------------------------------------------------------------------ init

// init next view
if (EL("next_filters")) {
	var ul = EL("next_filters").getElementsByTagName("li");
	for (var i = 0; i < ul.length; ++i) {
		ul[i].onclick = function() { next_filter(this.parentNode.id, this.id); return true; };
	}
}


// init prog view
var dc = EL("prog_filters").getElementsByTagName("li");
for (var i = 0; i < dc.length; ++i) {
	dc[i].onclick = function() { prog_filter(this.parentNode.id, this.id); return true; };
}
var sf = EL("search");
if (sf) {
	sf.onsubmit = function() { prog_filter(); return false; };
	sf.onreset = function() { EL("q").value = ""; prog_filter(); return true; };
}
EL("q").onblur = prog_filter;


// init part view
var pc = EL("part_filters").getElementsByTagName("li");
for (var i = 0; i < pc.length; ++i) {
	pc[i].onclick = function() { part_filter(this.parentNode.id, this); return true; };
}


// set up fixed time display
if (EL("scroll_link")) {
	EL("scroll_link").onclick = function() { EL("top").scrollIntoView(); return false; };
	var prev_scroll = { "i": 0, "top": 0 };
	var n = 0;
	if (full_version) { window.onscroll = function() {
		var st = document.body.scrollTop || document.documentElement.scrollTop;

		EL("scroll").style.display = (st > 0) ? 'block' : 'none';

		st += 20; // to have more time for change behind new_time
		var te = EL("time"); if (!te) return;
		var tl = document.getElementsByClassName("new_time"); if (!tl.length) return;
		//var i = 1; while ((i < tl.length) && (tl[i].offsetTop < st)) ++i; --i;
		var i = prev_scroll.top ? prev_scroll.i : 1;
		if (i >= tl.length) i = tl.length - 1;
		if (st > tl[i].offsetTop) {
			while ((i < tl.length) && (st > tl[i].offsetTop)) ++i;
			--i;
		} else {
			while ((i >= 0) && (st < tl[i].offsetTop)) --i;
		}
		if (i < 0) i = 0;

		prev_scroll.i = i;
		prev_scroll.top = tl[i].offsetTop;
		te.innerHTML = tl[i].getAttribute("data-day") + "<br />" + tl[i].innerHTML;
	};} else {
		EL("time").style.display = "none";
		EL("scroll").style.display = "none";
	}
}


function init_view() {
	var opt = window.location.hash.substr(1);
	if (opt.length < 4) opt = storage_get('view');
	if (!opt) opt = 'prog';
	switch (opt.substr(0,4)) {
		case 'next': show_next_view(); break;
		case 'star': show_star_view(); break;
		case 'part': show_part_view(opt.substr(4)); break;
		case 'info': show_info_view(); break;
		case 'prog': show_prog_view(opt.substr(4)); break;
		default:     show_prog_view(); break;
	}

	if (EL("top")) EL("top").scrollIntoView();
	if (EL("load_disable")) EL("load_disable").style.display = "none";
}

init_view();
window.onhashchange = init_view;
