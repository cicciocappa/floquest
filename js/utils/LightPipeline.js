var FloQuest = FloQuest || {};

/**
 * LightPipeline — wrapper di compatibilità per il sistema di lighting.
 *
 * In Phaser 4, il lighting è built-in: basta chiamare sprite.setLighting(true).
 * Questo modulo mantiene l'interfaccia register() come no-op per evitare
 * errori nei punti che ancora lo chiamano.
 */
FloQuest.LightPipeline = {
    register: function(scene) {
        // No-op in Phaser 4 — il lighting è gestito nativamente
    }
};
