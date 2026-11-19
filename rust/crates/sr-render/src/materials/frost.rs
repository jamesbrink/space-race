//! Rime on a cold skin. Coverage is packed in the alpha channel of its opaque base-colour map.

use bevy::gltf::GltfMaterialName;
use bevy::pbr::{ExtendedMaterial, MaterialExtension};
use bevy::prelude::*;
use bevy::render::render_resource::AsBindGroup;
use bevy::shader::ShaderRef;
use bevy::world_serialization::WorldInstanceReady;

/// Amount of rime left on cold hardware. The game may update this on its flight clock.
#[derive(Resource)]
pub struct Frost {
    /// Fraction remaining, from bare paint (0) to a fully loaded vehicle on the pad (1).
    pub amount: f32,
}

impl Default for Frost {
    fn default() -> Self {
        Self { amount: 1.0 }
    }
}

#[derive(Asset, AsBindGroup, Reflect, Debug, Clone)]
struct Rime {
    #[uniform(100)]
    amount: f32,
}

impl MaterialExtension for Rime {
    fn fragment_shader() -> ShaderRef {
        "shaders/rime.wesl".into()
    }
}

type ColdSkin = ExtendedMaterial<StandardMaterial, Rime>;

pub(super) fn register(app: &mut App) {
    app.init_resource::<Frost>()
        .add_plugins(MaterialPlugin::<ColdSkin>::default())
        .add_observer(on_ready)
        .add_systems(Update, shed.run_if(resource_changed::<Frost>));
}

fn on_ready(
    ready: On<WorldInstanceReady>,
    mut commands: Commands,
    tree: Query<&Children>,
    named: Query<(&MeshMaterial3d<StandardMaterial>, &GltfMaterialName)>,
    standard: Res<Assets<StandardMaterial>>,
    mut skins: ResMut<Assets<ColdSkin>>,
    frost: Res<Frost>,
) {
    for entity in tree.iter_descendants(ready.entity) {
        let Ok((source, name)) = named.get(entity) else { continue };
        if name.0 != "frost-lox" {
            continue;
        }
        let Some(base) = standard.get(source.id()) else { continue };
        if base.base_color_texture.is_none() {
            continue;
        }
        let skin = skins
            .add(ColdSkin { base: base.clone(), extension: Rime { amount: frost.amount.clamp(0.0, 1.0) } });
        commands.entity(entity).remove::<MeshMaterial3d<StandardMaterial>>().insert(MeshMaterial3d(skin));
    }
}

fn shed(frost: Res<Frost>, mut skins: ResMut<Assets<ColdSkin>>) {
    let amount = frost.amount.clamp(0.0, 1.0);
    for (_, skin) in skins.iter_mut() {
        skin.extension.amount = amount;
    }
}
