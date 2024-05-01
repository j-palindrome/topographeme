#version 300 es
precision mediump float;

in vec4 v_color;
in vec2 uv;
out vec4 fragColor;

uniform sampler2D u_textTexture;
uniform vec2 u_resolution;
uniform sampler2D u_videoTexture;
uniform sampler2D u_videoLayersTexture;
uniform float mix;
uniform float opacity;

void main() {

  if(distance(gl_PointCoord, vec2(0.5f, 0.5f)) > 0.5f)
    discard;

  // fragColor = vec4(1.0f, 1.0f, 1.0f, (1.0f - texture(u_textTexture, uv).a) * 0.3f);
  fragColor = vec4(1.0f, 1.0f, 1.0f, max(texture(u_textTexture, uv).a, opacity));
}