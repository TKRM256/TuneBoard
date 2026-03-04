package jp.tubeboard.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import jp.tubeboard.features.auth.JwtAuthenticationFilter;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

        private final JwtAuthenticationFilter jwtAuthenticationFilter;

        public SecurityConfig(JwtAuthenticationFilter jwtAuthenticationFilter) {
                this.jwtAuthenticationFilter = jwtAuthenticationFilter;
        }

        @Value("${app.frontend-base-url:http://localhost:5173}")
        private String frontendBaseUrl;

        @Bean
        public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
                http
                                .csrf(AbstractHttpConfigurer::disable)
                                .cors(Customizer.withDefaults())
                                .sessionManagement(session -> session
                                                .sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED))
                                .authorizeHttpRequests(auth -> auth
                                                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                                                .requestMatchers("/api/health").permitAll()
                                                .requestMatchers("/api/health/error").permitAll()
                                                .requestMatchers("/api/auth/me").permitAll()
                                                .requestMatchers(HttpMethod.POST, "/api/auth/token").permitAll()
                                                .requestMatchers("/oauth2/**", "/login/**").permitAll()
                                                .anyRequest().authenticated())
                                .oauth2Login(oauth2 -> oauth2
                                                .defaultSuccessUrl(frontendBaseUrl + "/?login=success", true)
                                                .failureUrl(frontendBaseUrl + "/?login=error"))
                                .logout(logout -> logout
                                                .logoutUrl("/logout")
                                                .logoutSuccessUrl(frontendBaseUrl + "/?logout=success")
                                                .invalidateHttpSession(true)
                                                .deleteCookies("JSESSIONID"))
                                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
                                .headers(headers -> headers.frameOptions(frame -> frame.disable()));

                return http.build();
        }
}
