in vec4 v_color;
in vec2 uv;

uniform sampler2D u_textTexture;
uniform sampler2D u_videoPauseTexture;
uniform sampler2D u_videoTexture;
uniform sampler2D u_videoLayersTexture;
uniform vec2 u_resolution;
uniform float mix;
uniform float opacity;

float luma(vec4 inputVector) {
  return (inputVector.r + inputVector.b + inputVector.g) / 3.0;
}

void main() {
  if(distance(gl_PointCoord, vec2(0.5, 0.5)) > 0.5)
    discard;

  // fragColor = vec4(1.0, 1.0, 1.0, texture(u_videoTexture, uv).a * 0.3);

  fragColor = vec4(1.0, 1.0, 1.0, luma(texture(u_videoPauseTexture, uv)) * 0.3);
  // fragColor = vec4(1.0, 1.0, 1.0, max(texture(u_textTexture, uv).a, opacity));
}