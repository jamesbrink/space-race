//! The small JSON files the web build's tools write beside their maps (`public/globe/<region>.json`,
//! `<region>.surface.json`), read as they are so a map's middle, extent and scale are stated once, by the tool
//! that baked it. A reader for those files and no more: numbers, text, lists and objects.

use bevy::asset::io::Reader;
use bevy::asset::{AssetLoader, LoadContext};
use bevy::prelude::*;

/// A JSON value.
#[derive(Debug, Clone, PartialEq)]
pub enum Json {
    /// `null`.
    Null,
    /// `true` or `false`.
    Bool(bool),
    /// A number.
    Number(f64),
    /// A string.
    Text(String),
    /// A list.
    List(Vec<Json>),
    /// An object, its members in the order written.
    Object(Vec<(String, Json)>),
}

impl Json {
    /// The value a text holds, or `None` if it is not JSON.
    #[must_use]
    pub fn parse(text: &str) -> Option<Self> {
        let mut reader = Text { bytes: text.as_bytes(), at: 0 };
        let value = reader.value()?;
        reader.space();
        (reader.at == reader.bytes.len()).then_some(value)
    }

    /// An object's member.
    #[must_use]
    pub fn get(&self, key: &str) -> Option<&Self> {
        let Self::Object(members) = self else { return None };
        members.iter().find(|(name, _)| name == key).map(|(_, value)| value)
    }

    /// A number's value.
    #[must_use]
    pub fn number(&self) -> Option<f64> {
        if let Self::Number(n) = self { Some(*n) } else { None }
    }

    /// A string's text.
    #[must_use]
    pub fn text(&self) -> Option<&str> {
        if let Self::Text(t) = self { Some(t) } else { None }
    }

    /// A list's items; nothing for anything else.
    #[must_use]
    pub fn list(&self) -> &[Self] {
        if let Self::List(items) = self { items } else { &[] }
    }

    /// A list of exactly `N` numbers.
    #[must_use]
    pub fn numbers<const N: usize>(&self) -> Option<[f64; N]> {
        let items: Vec<f64> = self.list().iter().filter_map(Self::number).collect();
        items.try_into().ok()
    }
}

struct Text<'a> {
    bytes: &'a [u8],
    at: usize,
}

impl Text<'_> {
    fn space(&mut self) {
        while self.bytes.get(self.at).is_some_and(u8::is_ascii_whitespace) {
            self.at += 1;
        }
    }

    fn take(&mut self, word: &str) -> bool {
        let found = self.bytes[self.at..].starts_with(word.as_bytes());
        if found {
            self.at += word.len();
        }
        found
    }

    fn value(&mut self) -> Option<Json> {
        self.space();
        match *self.bytes.get(self.at)? {
            b'{' => self.object(),
            b'[' => self.items(),
            b'"' => self.string().map(Json::Text),
            b't' => self.take("true").then_some(Json::Bool(true)),
            b'f' => self.take("false").then_some(Json::Bool(false)),
            b'n' => self.take("null").then_some(Json::Null),
            _ => self.number(),
        }
    }

    fn number(&mut self) -> Option<Json> {
        let start = self.at;
        while self.bytes.get(self.at).is_some_and(|b| b"+-.eE0123456789".contains(b)) {
            self.at += 1;
        }
        std::str::from_utf8(&self.bytes[start..self.at]).ok()?.parse().ok().map(Json::Number)
    }

    /// A string, from its opening quote. Escapes are kept as written but for the quote and the stroke: the tools
    /// write none.
    fn string(&mut self) -> Option<String> {
        self.at += 1;
        let mut text = Vec::new();
        loop {
            let byte = *self.bytes.get(self.at)?;
            self.at += 1;
            match byte {
                b'"' => return String::from_utf8(text).ok(),
                b'\\' => {
                    text.push(*self.bytes.get(self.at)?);
                    self.at += 1;
                }
                _ => text.push(byte),
            }
        }
    }

    fn items(&mut self) -> Option<Json> {
        self.at += 1;
        let mut items = Vec::new();
        loop {
            self.space();
            if self.take("]") {
                return Some(Json::List(items));
            }
            items.push(self.value()?);
            self.space();
            if !self.take(",") && self.bytes.get(self.at) != Some(&b']') {
                return None;
            }
        }
    }

    fn object(&mut self) -> Option<Json> {
        self.at += 1;
        let mut members = Vec::new();
        loop {
            self.space();
            if self.take("}") {
                return Some(Json::Object(members));
            }
            let name = self.string()?;
            self.space();
            if !self.take(":") {
                return None;
            }
            members.push((name, self.value()?));
            self.space();
            if !self.take(",") && self.bytes.get(self.at) != Some(&b'}') {
                return None;
            }
        }
    }
}

/// A JSON file, read.
#[derive(Asset, TypePath, Debug, Clone)]
pub struct JsonFile(pub Json);

/// Reads `.json` files.
#[derive(Default, TypePath)]
pub struct JsonLoader;

impl AssetLoader for JsonLoader {
    type Asset = JsonFile;
    type Settings = ();
    type Error = std::io::Error;

    async fn load(
        &self,
        reader: &mut dyn Reader,
        _settings: &(),
        _context: &mut LoadContext<'_>,
    ) -> Result<JsonFile, std::io::Error> {
        let mut bytes = Vec::new();
        reader.read_to_end(&mut bytes).await?;
        let not_json = || std::io::Error::new(std::io::ErrorKind::InvalidData, "not JSON");
        let text = std::str::from_utf8(&bytes).map_err(|_| not_json())?;
        Json::parse(text).map(JsonFile).ok_or_else(not_json)
    }

    fn extensions(&self) -> &[&str] {
        &["json"]
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn it_reads_what_the_tools_write() {
        let text = r#"{ "region": "cape", "spread": 8, "levels": [ { "name": "near", "box": [ -0.5, 0.5, -1e-3, 2 ] } ],
            "ok": true, "none": null }"#;
        let json = Json::parse(text).unwrap();
        assert_eq!(json.get("region").and_then(Json::text), Some("cape"));
        assert_eq!(json.get("spread").and_then(Json::number), Some(8.0));
        let level = &json.get("levels").unwrap().list()[0];
        assert_eq!(level.get("box").and_then(Json::numbers::<4>), Some([-0.5, 0.5, -0.001, 2.0]));
        assert_eq!(json.get("ok"), Some(&Json::Bool(true)));
        assert_eq!(json.get("none"), Some(&Json::Null));
    }

    #[test]
    fn it_refuses_what_is_not_json() {
        assert_eq!(Json::parse("{ \"a\": }"), None);
        assert_eq!(Json::parse("[1, 2"), None);
        assert_eq!(Json::parse("{} trailing"), None);
    }
}
