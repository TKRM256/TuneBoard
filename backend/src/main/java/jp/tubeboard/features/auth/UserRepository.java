package jp.tubeboard.features.auth;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findBySubAndDeletedAtIsNull(String sub);

    Optional<User> findByEmailAndDeletedAtIsNull(String email);
}
