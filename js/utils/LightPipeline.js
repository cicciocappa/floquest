var FloQuest = FloQuest || {};

FloQuest.LightPipeline = (function() {
    var MAX_LIGHTS = 10;

    var FRAG_SHADER = '#define SHADER_NAME CUSTOM_LIGHT_FS\n' +
        'precision mediump float;\n' +
        'struct Light { vec2 position; vec3 color; float intensity; float radius; };\n' +
        'const int kMaxLights = ' + MAX_LIGHTS + ';\n' +
        'uniform vec4 uCamera;\n' +
        'uniform vec2 uResolution;\n' +
        'uniform sampler2D uMainSampler;\n' +
        'uniform sampler2D uNormSampler;\n' +
        'uniform vec3 uAmbientLightColor;\n' +
        'uniform int uLightCount;\n' +
        'uniform Light uLights[' + MAX_LIGHTS + '];\n' +
        'varying vec2 outTexCoord;\n' +
        'varying float outTexId;\n' +
        'varying float outTintEffect;\n' +
        'varying vec4 outTint;\n' +
        'void main() {\n' +
        '    vec4 texel = texture2D(uMainSampler, outTexCoord);\n' +
        '    if (texel.a < 0.1) discard;\n' +
        '    vec3 N = normalize(texture2D(uNormSampler, outTexCoord).rgb * 2.0 - 1.0);\n' +
        '    vec3 finalColor = vec3(0.0);\n' +
        '    for (int i = 0; i < ' + MAX_LIGHTS + '; i++) {\n' +
        '        if (i >= uLightCount) break;\n' +
        '        Light light = uLights[i];\n' +
        '        vec3 lightDir = vec3(\n' +
        '            (light.position.x - gl_FragCoord.x) / uResolution.x,\n' +
        '            (light.position.y - gl_FragCoord.y) / uResolution.y,\n' +
        '            0.15);\n' +
        '        vec3 L = normalize(lightDir);\n' +
        '        float d = length(lightDir.xy) * uCamera.w;\n' +
        '        float NdotL = max(dot(N, L), 0.0);\n' +
        '        float hl = NdotL * 0.6 + 0.4;\n' +
        '        float atten = 1.0 / (1.0 + 2.0 * d * d);\n' +
        '        finalColor += light.color * hl * light.intensity * atten;\n' +
        '    }\n' +
        '    vec4 co = vec4(uAmbientLightColor + finalColor, 1.0);\n' +
        '    gl_FragColor = vec4(texel.rgb * co.rgb, texel.a);\n' +
        '}';

    class LitSpritePipeline extends Phaser.Renderer.WebGL.Pipelines.LightPipeline {
        constructor(config) {
            if (config instanceof Phaser.Game) config = { game: config };
            config.fragShader = FRAG_SHADER;
            config.maxLights = MAX_LIGHTS;
            config.name = 'LitSpritePipeline';
            super(config);
        }
    }

    return {
        PipelineClass: LitSpritePipeline,
        register: function(scene) {
            if (!scene.renderer.pipelines.has('LitSpritePipeline')) {
                scene.renderer.pipelines.add('LitSpritePipeline',
                    new LitSpritePipeline({ game: scene.game }));
            }
        }
    };
})();
